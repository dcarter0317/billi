import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../services/supabase';
import { useUser } from './UserContext';

interface UserPreferences {
    themeMode: 'system' | 'light' | 'dark';
    notificationsEnabled: boolean;
    biometricsEnabled: boolean;
    currency: string;
    payPeriodStart: number; // Stored as timestamp
    payPeriodOccurrence: 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly';
    payPeriodSemiMonthlyDays: [number, number]; // e.g. [15, 30]
    upcomingReminderDays: number;
}

interface UserPreferencesContextType {
    preferences: UserPreferences & { isDarkMode: boolean };
    isAuthenticated: boolean;
    setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
    toggleNotifications: () => void;
    toggleBiometrics: () => Promise<boolean>;
    setCurrency: (currency: string) => void;
    setPayPeriodStart: (date: Date) => void;
    setPayPeriodOccurrence: (occurrence: 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly') => void;
    setPayPeriodSemiMonthlyDays: (days: [number, number]) => void;
    setUpcomingReminderDays: (days: number) => void;
    authenticate: () => Promise<boolean>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const PREFERENCES_KEY = 'user_preferences';

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
    const colorScheme = useColorScheme();
    const systemColorScheme = colorScheme || 'light';

    const { user, isSignedIn } = useUser();

    const [preferences, setPreferences] = useState<UserPreferences>({
        themeMode: 'system',
        notificationsEnabled: true,
        biometricsEnabled: false,
        currency: 'USD',
        payPeriodStart: new Date(2026, 0, 26).getTime(),
        payPeriodOccurrence: 'bi-weekly',
        payPeriodSemiMonthlyDays: [15, 30],
        upcomingReminderDays: 2,
    });

    // Derive isDarkMode based on themeMode and system preference
    const isDarkMode = preferences.themeMode === 'system'
        ? systemColorScheme === 'dark'
        : preferences.themeMode === 'dark';

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load preferences on mount or auth change
    useEffect(() => {
        async function loadPreferences() {
            // Wait for Clerk to resolve if signed in, but don't block forever if not
            if (isSignedIn && !user) {
                console.log('[Preferences] Waiting for user object...');
                return;
            }

            try {
                // 1. Try cloud if signed in
                if (isSignedIn && user) {
                    console.log('[Preferences] Fetching cloud preferences for:', user.id);
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (!error && data) {
                        const cloudPrefs: UserPreferences = {
                            themeMode: data.theme_mode as any || 'system',
                            notificationsEnabled: data.notifications_enabled ?? true,
                            biometricsEnabled: data.biometrics_enabled ?? false,
                            currency: data.currency || 'USD',
                            payPeriodStart: data.pay_period_start ? new Date(data.pay_period_start).getTime() : new Date(2026, 0, 26).getTime(),
                            payPeriodOccurrence: data.pay_period_occurrence as any || 'bi-weekly',
                            payPeriodSemiMonthlyDays: data.pay_period_semi_monthly_days || [15, 30],
                            upcomingReminderDays: data.upcoming_warning_window ?? 2,
                        };
                        setPreferences(cloudPrefs);
                        if (!cloudPrefs.biometricsEnabled) setIsAuthenticated(true);
                        return;
                    } else if (error && error.code !== 'PGRST116') {
                        // PGRST116 is "no rows returned", which is expected for new users
                        console.error('[Preferences] Cloud load error:', error);
                    }
                }

                // 2. Fallback to local
                const saved = await getItemAsync(PREFERENCES_KEY);
                let localOrComputedPrefs = preferences;
                if (saved) {
                    const parsed = JSON.parse(saved);
                    localOrComputedPrefs = { ...preferences, ...parsed };
                    setPreferences(localOrComputedPrefs);
                    if (!parsed.biometricsEnabled) {
                        setIsAuthenticated(true);
                    }
                } else {
                    // Only mark authenticated if no local biometrics preference found
                    setIsAuthenticated(true);
                }

                // 3. Sync to Cloud if needed (satisfy FKs)
                if (isSignedIn && user) {
                    const { data: existing } = await supabase
                        .from('profiles')
                        .select('email')
                        .eq('id', user.id)
                        .single();

                    const currentEmail = user.email;
                    const dbEmail = existing?.email;
                    const finalEmail = (dbEmail && !dbEmail.endsWith('.appleid.com') && currentEmail.endsWith('.appleid.com'))
                        ? dbEmail
                        : currentEmail;

                    const { error: upsertError } = await supabase.from('profiles').upsert({
                        id: user.id,
                        email: finalEmail,
                        full_name: user.name, // Added for identity sync
                        avatar_url: user.avatar, // Added for identity sync
                        theme_mode: localOrComputedPrefs.themeMode,
                        notifications_enabled: localOrComputedPrefs.notificationsEnabled,
                        biometrics_enabled: localOrComputedPrefs.biometricsEnabled,
                        currency: localOrComputedPrefs.currency,
                        pay_period_start: new Date(localOrComputedPrefs.payPeriodStart).toISOString(),
                        pay_period_occurrence: localOrComputedPrefs.payPeriodOccurrence,
                        pay_period_semi_monthly_days: localOrComputedPrefs.payPeriodSemiMonthlyDays,
                        upcoming_warning_window: localOrComputedPrefs.upcomingReminderDays,
                        updated_at: new Date().toISOString()
                    });

                    if (upsertError) console.error('[Preferences] Initial upsert error:', upsertError);
                }
            } catch (e) {
                console.error('[Preferences] Failed to load preferences', e);
                setIsAuthenticated(true);
            }
        }
        loadPreferences();
    }, [isSignedIn, user?.id]); // Use user.id specifically for better dependency tracking

    // Internal utility functions (using function keyword for hoisting safety)
    async function savePrefsHelper(newPrefs: UserPreferences) {
        try {
            await setItemAsync(PREFERENCES_KEY, JSON.stringify(newPrefs));

            if (isSignedIn && user) {
                // Fetch existing email to avoid overwriting a real email with a relay one
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', user.id)
                    .single();

                const dbEmail = existing?.email;
                const currentEmail = user.email;
                const finalEmail = (dbEmail && !dbEmail.endsWith('.appleid.com') && currentEmail.endsWith('.appleid.com'))
                    ? dbEmail
                    : currentEmail;

                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: finalEmail,
                        theme_mode: newPrefs.themeMode,
                        notifications_enabled: newPrefs.notificationsEnabled,
                        biometrics_enabled: newPrefs.biometricsEnabled,
                        currency: newPrefs.currency,
                        pay_period_start: new Date(newPrefs.payPeriodStart).toISOString(),
                        pay_period_occurrence: newPrefs.payPeriodOccurrence,
                        pay_period_semi_monthly_days: newPrefs.payPeriodSemiMonthlyDays,
                        upcoming_warning_window: newPrefs.upcomingReminderDays,
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    console.error('Supabase sync error:', error);
                }
            }
        } catch (e) {
            console.error('Failed to save preferences locally:', e);
        }
    }

    async function authenticate() {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setIsAuthenticated(true);
                return true;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Billi',
                fallbackLabel: 'Enter Passcode',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Auth error', e);
            return false;
        }
    }

    // Exported setters
    const setThemeMode = (themeMode: 'system' | 'light' | 'dark') => {
        setPreferences(prev => {
            const next = { ...prev, themeMode };
            savePrefsHelper(next);
            return next;
        });
    };

    const toggleNotifications = () => {
        setPreferences(prev => {
            const next = { ...prev, notificationsEnabled: !prev.notificationsEnabled };
            savePrefsHelper(next);
            return next;
        });
    };

    const toggleBiometrics = async () => {
        const currentlyEnabled = preferences.biometricsEnabled;
        let success = true;

        if (!currentlyEnabled) {
            success = await authenticate();
        }

        if (success) {
            setPreferences(prev => {
                const isEnabling = !prev.biometricsEnabled;
                const next = { ...prev, biometricsEnabled: isEnabling };
                savePrefsHelper(next);
                if (!isEnabling) setIsAuthenticated(true);
                return next;
            });
            return true;
        }
        return false;
    };

    const setCurrency = (currency: string) => {
        setPreferences(prev => {
            const next = { ...prev, currency };
            savePrefsHelper(next);
            return next;
        });
    };

    const setPayPeriodStart = (date: Date) => {
        setPreferences(prev => {
            const next = { ...prev, payPeriodStart: date.getTime() };
            savePrefsHelper(next);
            return next;
        });
    };

    const setPayPeriodOccurrence = (occurrence: 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly') => {
        setPreferences(prev => {
            const next = { ...prev, payPeriodOccurrence: occurrence };
            savePrefsHelper(next);
            return next;
        });
    };

    const setPayPeriodSemiMonthlyDays = (days: [number, number]) => {
        setPreferences(prev => {
            const next = { ...prev, payPeriodSemiMonthlyDays: days };
            savePrefsHelper(next);
            return next;
        });
    };

    const setUpcomingReminderDays = (days: number) => {
        setPreferences(prev => {
            const next = { ...prev, upcomingReminderDays: days };
            savePrefsHelper(next);
            return next;
        });
    };

    return (
        <UserPreferencesContext.Provider value={{
            preferences: { ...preferences, isDarkMode },
            isAuthenticated,
            setThemeMode,
            toggleNotifications,
            toggleBiometrics,
            setCurrency,
            setPayPeriodStart,
            setPayPeriodOccurrence,
            setPayPeriodSemiMonthlyDays,
            setUpcomingReminderDays,
            authenticate
        }}>
            {children}
        </UserPreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(UserPreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a UserPreferencesProvider');
    }
    return context;
}
