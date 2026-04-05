import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
    async getToken(key: string) {
        try {
            return SecureStore.getItemAsync(key);
        } catch (err) {
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            return await SecureStore.setItemAsync(key, value);
        } catch (err) {
            console.error('[Clerk] Failed to save token to SecureStore:', err);
            throw err;
        }
    },
};

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('[Clerk] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
}
