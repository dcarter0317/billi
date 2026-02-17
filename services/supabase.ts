import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Global to hold the function that fetches the latest Clerk JWT
let getClerkToken: (() => Promise<string | null>) | null = null;

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const WebStorageAdapter = {
    getItem: async (key: string) => {
        try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch (err) {
            console.warn('[Supabase] Failed to read web storage:', err);
            return null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
        } catch (err) {
            console.warn('[Supabase] Failed to write web storage:', err);
        }
    },
    removeItem: async (key: string) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (err) {
            console.warn('[Supabase] Failed to remove web storage:', err);
        }
    },
};

/**
 * Custom fetch to inject Clerk JWT into Supabase requests.
 * This ensures the token is fresh on every request.
 */
const customFetch = async (url: string, options: any = {}) => {
    const headers = new Headers(options.headers || {});

    // Always ensure the Supabase anon key is present as 'apikey'
    headers.set('apikey', supabaseAnonKey);

    if (getClerkToken) {
        const token = await getClerkToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn('[Supabase] Clerk token provider returned null/undefined. Request may be unauthenticated.');
        }
    } else {
        console.warn('[Supabase] No Clerk token provider set. Request will be unauthenticated.');
    }

    options.headers = headers;
    return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: (Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter) as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    global: {
        fetch: customFetch as any,
    },
});

/**
 * Sets the function used to fetch the current Clerk JWT.
 */
export const setSupabaseTokenProvider = (provider: () => Promise<string | null>) => {
    getClerkToken = provider;
};
