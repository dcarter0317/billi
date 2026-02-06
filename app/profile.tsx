import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Avatar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { Camera } from 'lucide-react-native';

export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, updateUser } = useUser();

    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [avatar, setAvatar] = useState(user.avatar);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setName(user.name);
        setEmail(user.email);
        setAvatar(user.avatar);
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

    return (
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
            </ScrollView>
        </SafeAreaView>
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
    }
});
