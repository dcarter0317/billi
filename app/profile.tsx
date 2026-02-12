import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Avatar, useTheme, Switch, List, Menu, PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { usePreferences } from '../context/UserPreferencesContext';
import { Camera } from 'lucide-react-native';
import PayPeriodSettings from '../components/PayPeriodSettings';

export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, updateUser, deleteAccount } = useUser();
    const {
        preferences,
        setThemeMode,
        toggleNotifications,
        toggleBiometrics,
        setCurrency,
    } = usePreferences();

    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setAvatar(user.avatar);
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUser({ name, avatar });
            Alert.alert("Success", "Profile updated successfully.");
            router.back();
        } catch (error) {
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleToggleBiometrics = async () => {
        const success = await toggleBiometrics();
        if (!success && !preferences.biometricsEnabled) {
            Alert.alert("Error", "Failed to enable biometrics. Please try again.");
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is permanent and will delete all your bills, transactions, and profile data. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deleteAccount();
                            // Clerk's SignOut/SignedIn wrapper in _layout will handle redirect
                            Alert.alert("Account Deleted", "Your account and data have been permanently removed.");
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete account. Please try again.");
                            console.error(err);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };


    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <Button mode="text" onPress={() => router.back()} textColor={theme.colors.primary}>
                        Cancel
                    </Button>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Edit Profile</Text>
                    <Button
                        mode="text"
                        onPress={handleSave}
                        textColor={theme.colors.primary}
                        loading={isSaving}
                        disabled={isSaving}
                    >
                        Save
                    </Button>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={pickImage}>
                            {avatar ? (
                                <Avatar.Image size={100} source={{ uri: avatar }} />
                            ) : (
                                <Avatar.Text size={100} label={name.charAt(0).toUpperCase()} />
                            )}
                            <View style={[styles.cameraIcon, { backgroundColor: theme.colors.primary }]}>
                                <Camera size={20} color={theme.colors.onPrimary} />
                            </View>
                        </TouchableOpacity>
                        <Button mode="text" onPress={pickImage} style={{ marginTop: 8 }}>
                            Change Photo
                        </Button>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.divider} />

                    <PayPeriodSettings />

                    <View style={styles.divider} />

                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>App Settings</Text>

                    <View style={[styles.settingItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                        <Text variant="bodyLarge">Dark Mode</Text>
                        <Switch value={preferences.isDarkMode} onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')} color={theme.colors.primary} />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                        <Text variant="bodyLarge">Notifications</Text>
                        <Switch value={preferences.notificationsEnabled} onValueChange={toggleNotifications} color={theme.colors.primary} />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                        <Text variant="bodyLarge">Biometric Unlock</Text>
                        <Switch value={preferences.biometricsEnabled} onValueChange={handleToggleBiometrics} color={theme.colors.primary} />
                    </View>

                    <View style={styles.divider} />

                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>App Preferences</Text>

                    <Menu
                        visible={currencyMenuVisible}
                        onDismiss={() => setCurrencyMenuVisible(false)}
                        anchor={
                            <List.Item
                                title="Currency"
                                titleStyle={{ fontSize: 16 }}
                                description={preferences.currency}
                                descriptionStyle={{ color: theme.colors.primary }}
                                onPress={() => setCurrencyMenuVisible(true)}
                                right={props => <List.Icon {...props} icon="chevron-right" />}
                                style={[styles.settingItem, { paddingVertical: 8, paddingHorizontal: 0 }]}
                            />
                        }
                    >
                        {currencies.map((curr) => (
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


                    <View style={styles.divider} />

                    <Button
                        mode="text"
                        onPress={handleDeleteAccount}
                        textColor={theme.colors.error}
                        loading={isDeleting}
                        disabled={isDeleting || isSaving}
                        icon="trash-can-outline"
                        style={{ marginBottom: 60 }}
                    >
                        Delete Account
                    </Button>

                </ScrollView>
            </SafeAreaView>
        </PaperProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    content: {
        padding: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    form: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 24,
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '600',
        opacity: 0.7,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    }
});
