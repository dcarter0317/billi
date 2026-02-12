import { Stack } from "expo-router";
import { View } from 'react-native';
import { PaperProvider, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BilliTheme } from "../constants/theme";

import { BillProvider } from '../context/BillContext';
import { UserProvider, useUser } from '../context/UserContext';

import { BilliDarkTheme, BilliLightTheme } from "../constants/theme";
import { UserPreferencesProvider, usePreferences } from "../context/UserPreferencesContext";
import SecurityLock from "../components/SecurityLock";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { CLERK_PUBLISHABLE_KEY, tokenCache } from "../services/clerk";

import AuthScreen from "../components/AuthScreen";
import WelcomeScreen from "../components/WelcomeScreen";

function RootLayoutContent() {
    const { preferences, isAuthenticated } = usePreferences();
    const { isLoaded: userLoaded, user } = useUser();
    const theme = preferences.isDarkMode ? BilliDarkTheme : BilliLightTheme;

    if (!userLoaded) {
        return (
            <PaperProvider theme={theme}>
                <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
                    <Text variant="titleLarge" style={{ opacity: 0.5 }}>Billi</Text>
                </View>
            </PaperProvider>
        );
    }

    return (
        <PaperProvider theme={theme}>
            <SignedIn>
                {!isAuthenticated ? (
                    <SecurityLock />
                ) : user?.name === 'User' ? (
                    <WelcomeScreen />
                ) : (
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="add-bill"
                            options={{
                                presentation: 'modal',
                                title: 'Add New Bill',
                                headerStyle: { backgroundColor: theme.colors.background },
                                headerTintColor: theme.colors.primary,
                                headerTitleStyle: { color: theme.colors.onSurface }
                            }}
                        />
                        <Stack.Screen
                            name="profile"
                            options={{
                                presentation: 'modal',
                                headerShown: false,
                            }}
                        />
                    </Stack>
                )}
            </SignedIn>
            <SignedOut>
                <AuthScreen />
            </SignedOut>
        </PaperProvider>
    );
}

export default function RootLayout() {
    return (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
            <SafeAreaProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <UserProvider>
                        <UserPreferencesProvider>
                            <BillProvider>
                                <RootLayoutContent />
                            </BillProvider>
                        </UserPreferencesProvider>
                    </UserProvider>
                </GestureHandlerRootView>
            </SafeAreaProvider>
        </ClerkProvider>
    );
}
