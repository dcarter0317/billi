import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Global to hold the function that fetches the latest Clerk JWT
let getClerkToken: (() => Promise<string | null>) | null = null;

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
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
        }
    }

    options.headers = headers;
    return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter as any,
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
