import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useUser as useClerkUser, useSession } from '@clerk/clerk-expo';
import { setSupabaseTokenProvider, supabase } from '../services/supabase';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
}

interface UserContextType {
    user: UserProfile | null;
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    updateUser: (data: { name?: string; email?: string; avatar?: string | null }) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();
    const { session } = useSession();
    const [supabaseProfile, setSupabaseProfile] = useState<any>(null);

    // Fetch Supabase profile on load
    useEffect(() => {
        if (!clerkUser) {
            setSupabaseProfile(null);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', clerkUser.id)
                    .single();

                if (data) {
                    setSupabaseProfile(data);
                } else if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchProfile();
    }, [clerkUser]);

    const user: UserProfile | null = clerkUser ? {
        id: clerkUser.id,
        name: supabaseProfile?.full_name || clerkUser.fullName || clerkUser.firstName || (() => {
            // Priority:
            // 1. Supabase Profile Name (checked above)
            // 2. Clerk name (checked above)
            // 3. Email local part if it's NOT a relay email
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';
            const [localPart, domain] = email.split('@');
            if (localPart && domain && !domain.includes('appleid.com')) {
                return localPart.split(/[\._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            }
            // 4. Last resort fallback
            return 'User';
        })(),
        email: supabaseProfile?.email || (() => {
            // Priority:
            // 1. Supabase Profile Email
            // 2. A verified email that is NOT a relay email (@appleid.com)
            const nonRelay = clerkUser.emailAddresses.find(e =>
                e.verification.status === 'verified' && !e.emailAddress.endsWith('.appleid.com')
            );
            if (nonRelay) return nonRelay.emailAddress;

            // 3. The primary email address
            return clerkUser.primaryEmailAddress?.emailAddress || '';
        })(),
        avatar: supabaseProfile?.avatar_url || clerkUser.imageUrl || null,
    } : null;

    const updateUser = async (data: { name?: string; email?: string; avatar?: string | null }) => {
        if (!clerkUser) return;

        const updateData: any = {};
        if (data.name) {
            const nameParts = data.name.trim().split(/\s+/);
            updateData.firstName = nameParts[0];
            updateData.lastName = nameParts.slice(1).join(' ');
        }

        try {
            // 1. Update Clerk
            await clerkUser.update(updateData);

            // 2. Update Supabase
            const supabaseUpdates: any = {
                id: clerkUser.id,
                updated_at: new Date(),
                email: data.email || clerkUser.primaryEmailAddress?.emailAddress,
                full_name: data.name || supabaseProfile?.full_name || clerkUser.fullName,
                avatar_url: data.avatar || supabaseProfile?.avatar_url || clerkUser.imageUrl,
            };

            const { error } = await supabase.from('profiles').upsert(supabaseUpdates);

            if (error) {
                console.error('Error updating Supabase profile:', error);
                throw error;
            }

            // 3. Update local state
            setSupabaseProfile((prev: any) => ({
                ...(prev || {}),
                ...supabaseUpdates
            }));

        } catch (err) {
            console.error('Error updating user profile:', err);
            throw err;
        }
    };

    const deleteAccount = async () => {
        if (!clerkUser) return;

        try {
            // 1. Clear Supabase Data
            // Transactions first (FK dependency)
            await supabase.from('transactions').delete().eq('user_id', clerkUser.id);
            // Bills
            await supabase.from('bills').delete().eq('user_id', clerkUser.id);
            // Profile last
            await supabase.from('profiles').delete().eq('id', clerkUser.id);

            // 2. Delete Clerk Account
            await clerkUser.delete();

            console.log('[Account Deletion] Successfully wiped Supabase and Clerk data');
        } catch (err) {
            console.error('Error during account deletion:', err);
            throw err;
        }
    };

    // Proactively set the token provider as soon as we have a session
    // This helps prevent race conditions where other contexts try to use Supabase 
    // before the effect has a chance to run.
    if (session) {
        setSupabaseTokenProvider(() => {
            return session.getToken({ template: 'supabase' });
        });
    }

    useEffect(() => {
        if (session) {
            console.log('[UserContext] Session detected, token provider ready');
        }
    }, [session]);

    return (
        <UserContext.Provider value={{ user, isLoaded, isSignedIn, updateUser, deleteAccount }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
