import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { ShieldCheck, Fingerprint } from 'lucide-react-native';
import { usePreferences } from '../context/UserPreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SecurityLock() {
    const theme = useTheme();
    const { authenticate } = usePreferences();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={theme.dark ? ['#1a1a2e', '#0a0a12'] : ['#ffffff', '#f5f7fa']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <ShieldCheck size={80} color={theme.colors.primary} strokeWidth={1.5} />
                    <View style={styles.subIcon}>
                        <Fingerprint size={32} color={theme.colors.primary} />
                    </View>
                </View>

                <Text variant="headlineMedium" style={styles.title}>Billi Locked</Text>
                <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Please authenticate to access your financial data
                </Text>

                <Button
                    mode="contained"
                    onPress={authenticate}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                >
                    Unlock App
                </Button>

                <Text variant="labelSmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
                    Securely encrypted & protected
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        marginBottom: 32,
        position: 'relative',
    },
    subIcon: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        borderRadius: 12,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    buttonContent: {
        height: 56,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    footerText: {
        marginTop: 24,
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
