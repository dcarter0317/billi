import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, List, Switch, useTheme, Divider, Button, Avatar, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../../context/UserPreferencesContext';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';
import {
    Moon,
    Bell,
    ShieldCheck,
    CircleUser,
    LogOut,
    ChevronRight,
    DollarSign,
    Info,
    Trash2,
    Lock,
    Sun,
    Monitor
} from 'lucide-react-native';

export default function SettingsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const {
        preferences,
        setThemeMode,
        toggleNotifications,
        toggleBiometrics,
        setCurrency,
        setUpcomingReminderDays
    } = usePreferences();
    const { user } = useUser();
    const [currencyMenuVisible, setCurrencyMenuVisible] = React.useState(false);
    const [themeMenuVisible, setThemeMenuVisible] = React.useState(false);
    const [reminderMenuVisible, setReminderMenuVisible] = React.useState(false);

    const onToggleNotifications = (value: boolean) => {
        toggleNotifications();
        if (value) {
            Alert.alert("Notifications", "You'll now receive bill reminders 1 day before they are due.");
        }
    };

    const onToggleBiometrics = (value: boolean) => {
        toggleBiometrics();
        if (value) {
            Alert.alert("Security", "Biometric unlock will be required on next launch.");
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: () => console.log('Logged Out') }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is permanent and will delete all your data. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => console.log('Account Deleted') }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header / Profile Summary */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>Settings</Text>
                    <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/profile')}>
                        {user.avatar ? (
                            <Avatar.Image size={64} source={{ uri: user.avatar }} />
                        ) : (
                            <Avatar.Text size={64} label={user.name.charAt(0).toUpperCase()} />
                        )}
                        <View style={styles.profileInfo}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{user.name}</Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{user.email}</Text>
                        </View>
                        <ChevronRight size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>

                <Divider style={styles.divider} />

                {/* Appearance Section */}
                <List.Section>
                    <List.Subheader style={styles.subheader}>Appearance</List.Subheader>
                    <Menu
                        visible={themeMenuVisible}
                        onDismiss={() => setThemeMenuVisible(false)}
                        anchor={
                            <List.Item
                                title="App Theme"
                                description={preferences.themeMode.charAt(0).toUpperCase() + preferences.themeMode.slice(1)}
                                left={props => (
                                    <View style={styles.iconContainer}>
                                        {preferences.themeMode === 'dark' ? (
                                            <Moon size={20} color={theme.colors.primary} />
                                        ) : preferences.themeMode === 'light' ? (
                                            <Sun size={20} color={theme.colors.primary} />
                                        ) : (
                                            <Monitor size={20} color={theme.colors.primary} />
                                        )}
                                    </View>
                                )}
                                onPress={() => setThemeMenuVisible(true)}
                                right={() => <ChevronRight size={20} color={theme.colors.onSurfaceVariant} style={{ marginTop: 12 }} />}
                            />
                        }
                    >
                        {(['system', 'light', 'dark'] as const).map((mode) => (
                            <Menu.Item
                                key={mode}
                                onPress={() => {
                                    setThemeMode(mode);
                                    setThemeMenuVisible(false);
                                }}
                                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                                leadingIcon={preferences.themeMode === mode ? "check" : undefined}
                            />
                        ))}
                    </Menu>
                    <Menu
                        visible={currencyMenuVisible}
                        onDismiss={() => setCurrencyMenuVisible(false)}
                        anchor={
                            <List.Item
                                title="Currency"
                                description={preferences.currency}
                                left={props => <View style={styles.iconContainer}><DollarSign size={20} color={theme.colors.primary} /></View>}
                                onPress={() => setCurrencyMenuVisible(true)}
                                right={() => <ChevronRight size={20} color={theme.colors.onSurfaceVariant} style={{ marginTop: 12 }} />}
                            />
                        }
                    >
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((curr) => (
                            <Menu.Item
                                key={curr}
                                onPress={() => {
                                    setCurrency(curr);
                                    setCurrencyMenuVisible(false);
                                }}
                                title={curr}
                                leadingIcon={preferences.currency === curr ? "check" : undefined}
                            />
                        ))}
                    </Menu>
                </List.Section>

                <Divider style={styles.divider} />

                {/* Preferences Section */}
                <List.Section>
                    <List.Subheader style={styles.subheader}>Preferences</List.Subheader>
                    <List.Item
                        title="Push Notifications"
                        description="Receive alerts for upcoming bills"
                        left={props => <View style={styles.iconContainer}><Bell size={20} color={theme.colors.primary} /></View>}
                        right={() => <Switch value={preferences.notificationsEnabled} onValueChange={onToggleNotifications} />}
                    />
                    <Menu
                        visible={reminderMenuVisible}
                        onDismiss={() => setReminderMenuVisible(false)}
                        anchor={
                            <List.Item
                                title="Set Warning Alert"
                                description={`${preferences.upcomingReminderDays} days before due`}
                                left={props => <View style={styles.iconContainer}><Bell size={20} color={theme.colors.primary} /></View>}
                                onPress={() => setReminderMenuVisible(true)}
                                right={() => <ChevronRight size={20} color={theme.colors.onSurfaceVariant} style={{ marginTop: 12 }} />}
                            />
                        }
                    >
                        {[1, 2, 3, 5, 7].map((days) => (
                            <Menu.Item
                                key={days}
                                onPress={() => {
                                    setUpcomingReminderDays(days);
                                    setReminderMenuVisible(false);
                                }}
                                title={`${days} days before`}
                                leadingIcon={preferences.upcomingReminderDays === days ? "check" : undefined}
                            />
                        ))}
                    </Menu>
                    <List.Item
                        title="Biometric Unlock"
                        description="Require FaceID / TouchID"
                        left={props => <View style={styles.iconContainer}><ShieldCheck size={20} color={theme.colors.primary} /></View>}
                        right={() => <Switch value={preferences.biometricsEnabled} onValueChange={onToggleBiometrics} />}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                {/* Security & System Section */}
                <List.Section>
                    <List.Subheader style={styles.subheader}>Security & System</List.Subheader>
                    <List.Item
                        title="Change PIN"
                        left={props => <View style={styles.iconContainer}><Lock size={20} color={theme.colors.primary} /></View>}
                        onPress={() => console.log('Change PIN')}
                        right={() => <ChevronRight size={20} color={theme.colors.onSurfaceVariant} style={{ marginTop: 4 }} />}
                    />
                    <List.Item
                        title="About Billi"
                        description="Version 1.0.0 (Beta)"
                        left={props => <View style={styles.iconContainer}><Info size={20} color={theme.colors.primary} /></View>}
                        onPress={() => Alert.alert("About", "Billi is your premium financial companion.")}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                {/* Account Actions Section */}
                <View style={styles.actionSection}>
                    <Button
                        mode="outlined"
                        icon={() => <LogOut size={18} color={theme.colors.error} />}
                        textColor={theme.colors.error}
                        style={[styles.actionButton, { borderColor: theme.colors.error }]}
                        onPress={handleLogout}
                    >
                        Log Out
                    </Button>
                    <Button
                        mode="text"
                        icon={() => <Trash2 size={18} color={theme.colors.error} />}
                        textColor={theme.colors.error}
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                    >
                        Delete Account
                    </Button>
                </View>

                <View style={styles.footer}>
                    <Text variant="bodySmall" style={styles.footerText}>Made with ❤️ for financial freedom</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
    },
    headerTitle: {
        fontWeight: 'bold',
        marginBottom: 24,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    subheader: {
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginTop: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    actionSection: {
        padding: 20,
        gap: 12,
    },
    actionButton: {
        borderRadius: 12,
        borderWidth: 1.5,
    },
    deleteButton: {
        marginTop: 4,
    },
    footer: {
        padding: 40,
        alignItems: 'center',
    },
    footerText: {
        opacity: 0.5,
    }
});
