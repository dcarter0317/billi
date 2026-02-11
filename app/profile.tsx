import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Avatar, useTheme, Switch, List, Menu, Divider, PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '../context/UserContext';
import { usePreferences } from '../context/UserPreferencesContext';
import { useBills } from '../context/BillContext';
import { Camera } from 'lucide-react-native';

export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, updateUser } = useUser();
    const { resetToDefaults } = useBills();
    const {
        preferences,
        setThemeMode,
        toggleNotifications,
        toggleBiometrics,
        setCurrency,
        setPayPeriodStart,
        setPayPeriodOccurrence
    } = usePreferences();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [avatar, setAvatar] = useState(user?.avatar || null);
    const [isSaving, setIsSaving] = useState(false);
    const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
    const [frequencyMenuVisible, setFrequencyMenuVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setAvatar(user.avatar);
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUser({ name, email, avatar });
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

    const handleRestoreData = () => {
        Alert.alert(
            "Restore Demo Data",
            "This will overwrite all current bills with the initial demo data. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Restore",
                    style: "destructive",
                    onPress: async () => {
                        await resetToDefaults();
                        Alert.alert("Success", "Demo data restored.");
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
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.divider} />

                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Pay Period Settings</Text>

                    <View style={[styles.settingItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                        <Text variant="bodyLarge">Start Date</Text>
                        {Platform.OS === 'android' ? (
                            <Button
                                mode="outlined"
                                onPress={() => setShowDatePicker(true)}
                                textColor={theme.colors.primary}
                            >
                                {new Date(preferences.payPeriodStart).toLocaleDateString()}
                            </Button>
                        ) : (
                            <DateTimePicker
                                value={new Date(preferences.payPeriodStart)}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) setPayPeriodStart(selectedDate);
                                }}
                                themeVariant={preferences.isDarkMode ? 'dark' : 'light'}
                            />
                        )}
                    </View>

                    {Platform.OS === 'android' && showDatePicker && (
                        <DateTimePicker
                            value={new Date(preferences.payPeriodStart)}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setPayPeriodStart(selectedDate);
                            }}
                        />
                    )}

                    <Menu
                        visible={frequencyMenuVisible}
                        onDismiss={() => setFrequencyMenuVisible(false)}
                        anchor={
                            <List.Item
                                title="Frequency"
                                titleStyle={{ fontSize: 16 }}
                                description={preferences.payPeriodOccurrence}
                                descriptionStyle={{ textTransform: 'capitalize', color: theme.colors.primary }}
                                onPress={() => setFrequencyMenuVisible(true)}
                                right={props => <List.Icon {...props} icon="chevron-right" />}
                                style={[styles.settingItem, { paddingVertical: 8, paddingHorizontal: 0 }]}
                            />
                        }
                    >
                        <Menu.Item onPress={() => { setPayPeriodOccurrence('weekly'); setFrequencyMenuVisible(false); }} title="Weekly" />
                        <Menu.Item onPress={() => { setPayPeriodOccurrence('bi-weekly'); setFrequencyMenuVisible(false); }} title="Bi-Weekly" />
                        <Menu.Item onPress={() => { setPayPeriodOccurrence('monthly'); setFrequencyMenuVisible(false); }} title="Monthly" />
                    </Menu>

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
                        mode="outlined"
                        onPress={handleRestoreData}
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error, marginBottom: 40 }}
                    >
                        Restore Demo Data
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
