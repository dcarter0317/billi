import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

interface UserProfile {
    name: string;
    email: string;
    avatar: string | null;
}

interface UserContextType {
    user: UserProfile;
    updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_DATA_KEY = 'user_profile_data';

const DEFAULT_USER: UserProfile = {
    name: 'Guest User',
    email: 'guest@billi.app',
    avatar: null,
};

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const json = await SecureStore.getItemAsync(USER_DATA_KEY);
            if (json) {
                setUser(JSON.parse(json));
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    };

    const updateUser = async (updates: Partial<UserProfile>) => {
        const newUser = { ...user, ...updates };
        setUser(newUser);
        try {
            await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(newUser));
        } catch (error) {
            console.error('Failed to save user profile:', error);
        }
    };

    return (
        <UserContext.Provider value={{ user, updateUser }}>
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
