import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BilliTheme } from "../constants/theme";

import { BillProvider } from '../context/BillContext';
import { UserProvider } from '../context/UserContext';

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
                <Stack.Screen
                    name="profile"
                    options={{
                        presentation: 'modal',
                        headerShown: false,
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
                    <UserProvider>
                        <BillProvider>
                            <RootLayoutContent />
                        </BillProvider>
                    </UserProvider>
                </UserPreferencesProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
