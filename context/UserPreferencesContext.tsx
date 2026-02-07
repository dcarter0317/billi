import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

interface UserPreferences {
    isDarkMode: boolean;
    notificationsEnabled: boolean;
    biometricsEnabled: boolean;
    currency: string;
    payPeriodStart: number; // Stored as timestamp
    payPeriodFrequency: 'weekly' | 'bi-weekly' | 'monthly';
}

interface UserPreferencesContextType {
    preferences: UserPreferences;
    isAuthenticated: boolean;
    toggleDarkMode: () => void;
    toggleNotifications: () => void;
    toggleBiometrics: () => Promise<boolean>;
    setCurrency: (currency: string) => void;
    setPayPeriodStart: (date: Date) => void;
    setPayPeriodFrequency: (frequency: 'weekly' | 'bi-weekly' | 'monthly') => void;
    authenticate: () => Promise<boolean>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const PREFERENCES_KEY = 'user_preferences';

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
    const colorScheme = useColorScheme();
    const systemColorScheme = colorScheme || 'light';

    const [preferences, setPreferences] = useState<UserPreferences>({
        isDarkMode: systemColorScheme === 'dark',
        notificationsEnabled: true,
        biometricsEnabled: false,
        currency: 'USD',
        payPeriodStart: new Date(2026, 0, 26).getTime(), // Default to Jan 26, 2026
        payPeriodFrequency: 'bi-weekly',
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load preferences on mount
    useEffect(() => {
        async function loadPreferences() {
            try {
                const saved = await getItemAsync(PREFERENCES_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Merge with defaults to handle new fields for existing users
                    setPreferences(prev => ({ ...prev, ...parsed }));
                    // If biometrics are NOT enabled, we are "authenticated" by default
                    if (!parsed.biometricsEnabled) {
                        setIsAuthenticated(true);
                    }
                } else {
                    // No saved prefs, default to unlocked
                    setIsAuthenticated(true);
                }
            } catch (e) {
                console.error('Failed to load preferences', e);
                setIsAuthenticated(true);
            }
        }
        loadPreferences();
    }, []);

    // Helper to save and update state
    const savePreferences = async (newPrefs: UserPreferences) => {
        setPreferences(newPrefs);
        try {
            await setItemAsync(PREFERENCES_KEY, JSON.stringify(newPrefs));
        } catch (e) {
            console.error('Failed to save preferences', e);
        }
    };

    const authenticate = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                // Device doesn't support or isn't set up, fallback to unlocked
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
    };

    const toggleDarkMode = () => {
        savePreferences({ ...preferences, isDarkMode: !preferences.isDarkMode });
    };

    const toggleNotifications = () => {
        savePreferences({ ...preferences, notificationsEnabled: !preferences.notificationsEnabled });
    };

    const toggleBiometrics = async () => {
        const currentlyEnabled = preferences.biometricsEnabled;

        if (!currentlyEnabled) {
            // Enabling: Must verify first
            const success = await authenticate();
            if (success) {
                savePreferences({ ...preferences, biometricsEnabled: true });
                return true;
            }
            return false;
        } else {
            // Disabling
            savePreferences({ ...preferences, biometricsEnabled: false });
            setIsAuthenticated(true);
            return true;
        }
    };

    const setCurrency = (currency: string) => {
        savePreferences({ ...preferences, currency });
    };

    const setPayPeriodStart = (date: Date) => {
        savePreferences({ ...preferences, payPeriodStart: date.getTime() });
    };

    const setPayPeriodFrequency = (frequency: 'weekly' | 'bi-weekly' | 'monthly') => {
        savePreferences({ ...preferences, payPeriodFrequency: frequency });
    };

    return (
        <UserPreferencesContext.Provider value={{
            preferences,
            isAuthenticated,
            toggleDarkMode,
            toggleNotifications,
            toggleBiometrics,
            setCurrency,
            setPayPeriodStart,
            setPayPeriodFrequency,
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
