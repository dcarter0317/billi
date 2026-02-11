import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useUser as useClerkUser, useSession } from '@clerk/clerk-expo';
import { setSupabaseTokenProvider } from '../services/supabase';

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();
    const { session } = useSession();

    const user: UserProfile | null = clerkUser ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        avatar: clerkUser.imageUrl || null,
    } : null;

    const updateUser = async (data: { name?: string; email?: string; avatar?: string | null }) => {
        if (!clerkUser) return;

        const updateData: any = {};
        if (data.name) {
            const nameParts = data.name.trim().split(/\s+/);
            updateData.firstName = nameParts[0];
            updateData.lastName = nameParts.slice(1).join(' ');
        }

        // Note: Email updates are usually handled via Clerk's verification flow
        // and might require more than just a simple update call if not using Clerk's UI.
        // For this implementation, we focus on name and potentially avatar (if handled by Clerk).

        try {
            await clerkUser.update(updateData);
        } catch (err) {
            console.error('Error updating user profile:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (session) {
            setSupabaseTokenProvider(() => {
                console.log('[Supabase] Auth: Fetching fresh token for request');
                return session.getToken({ template: 'supabase' });
            });
        }
    }, [session]);

    return (
        <UserContext.Provider value={{ user, isLoaded, isSignedIn, updateUser }}>
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
