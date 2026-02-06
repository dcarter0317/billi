import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BilliTheme } from "../constants/theme";

// NOTE: Clerk has been temporarily removed due to react-dom dependency issues.
// Auth will be added back in Phase 2 (Backend Integration).

import { BillProvider } from '../context/BillContext';

import { BilliDarkTheme, BilliLightTheme } from "../constants/theme";
import { UserPreferencesProvider, usePreferences } from "../context/UserPreferencesContext";
import SecurityLock from "../components/SecurityLock";

function RootLayoutContent() {
    const { preferences, isAuthenticated } = usePreferences();
    const theme = preferences.isDarkMode ? BilliDarkTheme : BilliLightTheme;

    if (!isAuthenticated) {
        return (
            <PaperProvider theme={theme}>
                <SecurityLock />
            </PaperProvider>
        );
    }

    return (
        <PaperProvider theme={theme}>
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
            </Stack>
        </PaperProvider>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <UserPreferencesProvider>
                    <BillProvider>
                        <RootLayoutContent />
                    </BillProvider>
                </UserPreferencesProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
