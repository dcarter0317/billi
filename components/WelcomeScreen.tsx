import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';

export default function WelcomeScreen() {
    const theme = useTheme();
    const { user, updateUser } = useUser();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await updateUser({ name: name.trim() });
        } catch (error) {
            console.error('Failed to update name:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Avatar.Icon size={80} icon="hand-wave" style={{ backgroundColor: theme.colors.primary }} color="white" />
                            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                                Welcome to Billi!
                            </Text>
                            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                                Let's get to know you. What should we call you?
                            </Text>
                        </View>

                        <View style={styles.form}>
                            <TextInput
                                label="Your Name"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                style={styles.input}
                                placeholder="e.g. Alex"
                                autoFocus
                            />

                            <Button
                                mode="contained"
                                onPress={handleContinue}
                                loading={loading}
                                disabled={!name.trim() || loading}
                                style={styles.button}
                                contentStyle={styles.buttonContent}
                            >
                                Continue
                            </Button>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontWeight: 'bold',
        marginTop: 24,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.7,
        maxWidth: 280,
    },
    form: {
        width: '100%',
    },
    input: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    button: {
        borderRadius: 12,
    },
    buttonContent: {
        height: 56,
    },
});
