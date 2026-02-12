import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Avatar, Divider } from 'react-native-paper';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { Mail, Lock, User, ArrowRight, Github } from 'lucide-react-native';
import * as WebBrowser from "expo-web-browser";
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
    React.useEffect(() => {
        // Warm up the android browser to improve UX
        // https://docs.expo.dev/guides/authentication/#improving-user-experience
        void WebBrowser.warmUpAsync();
        return () => {
            void WebBrowser.coolDownAsync();
        };
    }, []);
}

export default function AuthScreen() {
    useWarmUpBrowser();
    const theme = useTheme();
    const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

    const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
    const { startOAuthFlow: appleAuth } = useOAuth({
        strategy: "oauth_apple",
        // @ts-ignore - Valid option for Apple strategy to force scopes
        additionalScopes: ['email', 'name']
    });

    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');

    const onSignInPress = async () => {
        if (!signInLoaded) return;
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await signIn.create({
                identifier: email.trim(),
                password,
            });

            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId });
            } else {
                // Handling multifactor or other states if needed
                setError('Login incomplete. Please contact support.');
            }
        } catch (err: any) {
            console.error('[Auth] Sign-in error:', err);
            const message = err.errors?.[0]?.message || 'Failed to sign in';
            if (message.toLowerCase().includes('identifier') || message.toLowerCase().includes('not found')) {
                setError('No account found with this email. Please sign up instead.');
            } else if (message.toLowerCase().includes('password')) {
                setError('Incorrect password. Please try again.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const onOAuthPress = async (strategy: 'google' | 'apple') => {
        setLoading(true);
        setError(null);
        try {
            const redirectUrl = Linking.createURL('/', { scheme: 'billi' });
            const { createdSessionId, setActive } = strategy === 'google'
                ? await googleAuth({ redirectUrl })
                : await appleAuth({ redirectUrl });

            if (createdSessionId) {
                setActive!({ session: createdSessionId });
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || `Failed to sign in with ${strategy}`);
        } finally {
            setLoading(false);
        }
    };

    const onSignUpPress = async () => {
        if (!signUpLoaded) return;
        if (!email.trim() || !password.trim() || !name.trim()) {
            setError('All fields are required for sign up');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await signUp.create({
                emailAddress: email.trim(),
                password,
                firstName: name.trim(),
            });

            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setPendingVerification(true);
        } catch (err: any) {
            console.error('[Auth] Sign-up error:', err);
            setError(err.errors?.[0]?.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    const onVerifyPress = async () => {
        if (!signUpLoaded) return;
        setLoading(true);
        setError(null);
        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === 'complete') {
                await setSignUpActive({ session: completeSignUp.createdSessionId });
            } else {
                console.log(JSON.stringify(completeSignUp, null, 2));
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    if (pendingVerification) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: theme.colors.background }]}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Avatar.Icon size={80} icon="email-check" style={{ backgroundColor: theme.colors.primary }} color="white" />
                        <Text variant="displaySmall" style={styles.title}>Verify Email</Text>
                        <Text variant="bodyLarge" style={styles.subtitle}>
                            Enter the code we sent to {email}
                        </Text>
                    </View>

                    <Card style={styles.card}>
                        <Card.Content style={styles.cardContent}>
                            <TextInput
                                label="Verification Code"
                                value={code}
                                onChangeText={setCode}
                                mode="outlined"
                                style={styles.input}
                                keyboardType="number-pad"
                                left={<TextInput.Icon icon={() => <ArrowRight size={20} color={theme.colors.onSurfaceVariant} />} />}
                                outlineColor="transparent"
                                activeOutlineColor={theme.colors.primary}
                            />

                            {error && (
                                <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
                                    {error}
                                </Text>
                            )}

                            <Button
                                mode="contained"
                                onPress={onVerifyPress}
                                loading={loading}
                                style={styles.button}
                                contentStyle={styles.buttonContent}
                                labelStyle={styles.buttonLabel}
                            >
                                Verify Email
                            </Button>

                            <TouchableOpacity
                                onPress={() => setPendingVerification(false)}
                                style={{ marginTop: 16, alignItems: 'center' }}
                            >
                                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                                    Back to Sign Up
                                </Text>
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Avatar.Icon size={80} icon="wallet" style={{ backgroundColor: theme.colors.primary }} color="white" />
                    <Text variant="displaySmall" style={styles.title}>Billi</Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>
                        {isSignUp ? 'Create your account' : 'Welcome back to your finances'}
                    </Text>
                </View>

                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        {/* Primary Options: Social Login */}
                        <View style={styles.socialButtonsContainer}>
                            <Button
                                mode="contained"
                                onPress={() => onOAuthPress('google')}
                                style={[styles.socialButtonLarge, { backgroundColor: '#ffffff' }]}
                                textColor="#000000"
                                icon={() => <Avatar.Icon size={24} icon="google" color="#DB4437" style={{ backgroundColor: 'transparent' }} />}
                                contentStyle={styles.socialButtonContent}
                            >
                                Google
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => onOAuthPress('apple')}
                                style={[styles.socialButtonLarge, { backgroundColor: '#000000' }]}
                                textColor="#ffffff"
                                icon={() => <Avatar.Icon size={24} icon="apple" color="#ffffff" style={{ backgroundColor: 'transparent' }} />}
                                contentStyle={styles.socialButtonContent}
                            >
                                Apple
                            </Button>
                        </View>

                        <View style={styles.emailDividerContainer}>
                            <Divider style={styles.emailDivider} />
                            <Text variant="labelSmall" style={styles.emailDividerText}>OR EMAIL</Text>
                            <Divider style={styles.emailDivider} />
                        </View>

                        {/* Secondary Options: Email Login */}
                        {isSignUp && (
                            <TextInput
                                label="Full Name"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                style={styles.input}
                                left={<TextInput.Icon icon={() => <User size={20} color={theme.colors.onSurfaceVariant} />} />}
                                outlineColor="transparent"
                                activeOutlineColor={theme.colors.primary}
                            />
                        )}
                        <TextInput
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            left={<TextInput.Icon icon={() => <Mail size={20} color={theme.colors.onSurfaceVariant} />} />}
                            outlineColor="transparent"
                            activeOutlineColor={theme.colors.primary}
                        />
                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            mode="outlined"
                            secureTextEntry
                            style={styles.input}
                            left={<TextInput.Icon icon={() => <Lock size={20} color={theme.colors.onSurfaceVariant} />} />}
                            outlineColor="transparent"
                            activeOutlineColor={theme.colors.primary}
                        />

                        {error && (
                            <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
                                {error}
                            </Text>
                        )}

                        <Button
                            mode="contained"
                            onPress={isSignUp ? onSignUpPress : onSignInPress}
                            loading={loading}
                            style={[styles.button, { backgroundColor: isSignUp ? theme.colors.primary : theme.colors.secondary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                        >
                            {isSignUp ? 'Create My Account' : 'Sign In to Billi'}
                        </Button>

                        <View style={styles.footer}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                            </Text>
                            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold', marginLeft: 8 }}>
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Card.Content>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontWeight: 'bold',
        marginTop: 16,
        letterSpacing: -1,
    },
    subtitle: {
        opacity: 0.6,
        marginTop: 4,
    },
    card: {
        borderRadius: 24,
        elevation: 0,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: Platform.OS === 'ios' ? 1 : 0,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardContent: {
        padding: 8,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 8,
        borderRadius: 16,
        elevation: 0,
    },
    buttonContent: {
        height: 56,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 8,
    },
    error: {
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: 'bold',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        marginTop: 8,
    },
    socialButtonLarge: {
        flex: 1,
        borderRadius: 16,
        elevation: 0,
        height: 56,
        justifyContent: 'center',
    },
    socialButtonContent: {
        height: 56,
        // Centered content
    },
    emailDividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        opacity: 0.3,
    },
    emailDivider: {
        flex: 1,
        height: 1,
    },
    emailDividerText: {
        marginHorizontal: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
