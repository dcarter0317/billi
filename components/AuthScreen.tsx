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
        // Warm up the native browser to improve UX (not supported on web).
        // https://docs.expo.dev/guides/authentication/#improving-user-experience
        if (Platform.OS !== 'web') {
            void WebBrowser.warmUpAsync();
        }
        return () => {
            if (Platform.OS !== 'web') {
                void WebBrowser.coolDownAsync();
            }
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
    const [isResetting, setIsResetting] = useState(false);
    const [resetStep, setResetStep] = useState<'request' | 'verify' | 'new_password'>('request');
    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailTaken, setEmailTaken] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');

    const onSignInPress = async () => {
        if (!signInLoaded) return;
        setEmailTaken(false);
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
        setEmailTaken(false);
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
            const clerkError = err.errors?.[0];
            const message = clerkError?.message || 'Failed to sign up';
            const code = clerkError?.code || '';
            const isIdentifierTaken =
                code === 'form_identifier_exists' ||
                code === 'identifier_already_taken' ||
                message.toLowerCase().includes('already') ||
                message.toLowerCase().includes('exists');

            if (isIdentifierTaken) {
                setEmailTaken(true);
                setIsSignUp(false);
                setPassword('');
                setError(null);
                return;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
        setError(null);
        setEmailTaken(false);
    };

    const startResetFlow = () => {
        setIsResetting(true);
        setResetStep('request');
        setResetEmail(email.trim());
        setResetCode('');
        setNewPassword('');
        setError(null);
        setEmailTaken(false);
    };

    const onRequestReset = async () => {
        if (!signInLoaded) return;
        if (!resetEmail.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await signIn.create({
                identifier: resetEmail.trim(),
            });

            const resetFactor = result.supportedFirstFactors?.find(
                (factor) => factor.strategy === 'reset_password_email_code'
            );

            const emailAddressId = (resetFactor as any)?.emailAddressId;

            if (!emailAddressId) {
                setError('Password reset is unavailable for this account.');
                return;
            }

            await result.prepareFirstFactor({
                strategy: 'reset_password_email_code',
                emailAddressId,
            });

            setResetStep('verify');
        } catch (err: any) {
            console.error('[Auth] Reset request error:', err);
            setError(err.errors?.[0]?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const onVerifyResetCode = async () => {
        if (!signInLoaded) return;
        if (!resetCode.trim()) {
            setError('Please enter the code');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code: resetCode.trim(),
            });

            if (result.status === 'needs_new_password') {
                setResetStep('new_password');
            } else if (result.status === 'complete' && result.createdSessionId) {
                await setSignInActive({ session: result.createdSessionId });
                setIsResetting(false);
            } else {
                setError('Unable to verify code. Please try again.');
            }
        } catch (err: any) {
            console.error('[Auth] Reset code error:', err);
            setError(err.errors?.[0]?.message || 'Failed to verify code');
        } finally {
            setLoading(false);
        }
    };

    const onSetNewPassword = async () => {
        if (!signInLoaded) return;
        if (!newPassword.trim()) {
            setError('Please enter a new password');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await signIn.resetPassword({
                password: newPassword.trim(),
            });

            if (result.status === 'complete' && result.createdSessionId) {
                await setSignInActive({ session: result.createdSessionId });
                setIsResetting(false);
            } else {
                setError('Password reset incomplete. Please try again.');
            }
        } catch (err: any) {
            console.error('[Auth] Reset password error:', err);
            setError(err.errors?.[0]?.message || 'Failed to reset password');
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
                                autoComplete="one-time-code"
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

    if (isResetting) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: theme.colors.background }]}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Avatar.Icon size={80} icon="lock-reset" style={{ backgroundColor: theme.colors.primary }} color="white" />
                        <Text variant="displaySmall" style={styles.title}>Reset Password</Text>
                        <Text variant="bodyLarge" style={styles.subtitle}>
                            {resetStep === 'request'
                                ? 'Enter your email to receive a reset code'
                                : resetStep === 'verify'
                                    ? `Enter the code sent to ${resetEmail}`
                                    : 'Set your new password'}
                        </Text>
                    </View>

                    <Card style={styles.card}>
                        <Card.Content style={styles.cardContent}>
                            {resetStep === 'request' && (
                                <TextInput
                                    label="Email Address"
                                    value={resetEmail}
                                    onChangeText={setResetEmail}
                                    mode="outlined"
                                    style={styles.input}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    left={<TextInput.Icon icon={() => <Mail size={20} color={theme.colors.onSurfaceVariant} />} />}
                                    outlineColor="transparent"
                                    activeOutlineColor={theme.colors.primary}
                                />
                            )}

                            {resetStep === 'verify' && (
                                <TextInput
                                    label="Verification Code"
                                    value={resetCode}
                                    onChangeText={setResetCode}
                                    mode="outlined"
                                    style={styles.input}
                                    keyboardType="number-pad"
                                    autoComplete="one-time-code"
                                    left={<TextInput.Icon icon={() => <ArrowRight size={20} color={theme.colors.onSurfaceVariant} />} />}
                                    outlineColor="transparent"
                                    activeOutlineColor={theme.colors.primary}
                                />
                            )}

                            {resetStep === 'new_password' && (
                                <TextInput
                                    label="New Password"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    mode="outlined"
                                    secureTextEntry
                                    style={styles.input}
                                    autoComplete="new-password"
                                    left={<TextInput.Icon icon={() => <Lock size={20} color={theme.colors.onSurfaceVariant} />} />}
                                    outlineColor="transparent"
                                    activeOutlineColor={theme.colors.primary}
                                />
                            )}

                            {error && (
                                <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
                                    {error}
                                </Text>
                            )}

                            {resetStep === 'request' && (
                                <Button
                                    mode="contained"
                                    onPress={onRequestReset}
                                    loading={loading}
                                    style={styles.button}
                                    contentStyle={styles.buttonContent}
                                    labelStyle={styles.buttonLabel}
                                >
                                    Send Reset Code
                                </Button>
                            )}

                            {resetStep === 'verify' && (
                                <Button
                                    mode="contained"
                                    onPress={onVerifyResetCode}
                                    loading={loading}
                                    style={styles.button}
                                    contentStyle={styles.buttonContent}
                                    labelStyle={styles.buttonLabel}
                                >
                                    Verify Code
                                </Button>
                            )}

                            {resetStep === 'new_password' && (
                                <Button
                                    mode="contained"
                                    onPress={onSetNewPassword}
                                    loading={loading}
                                    style={styles.button}
                                    contentStyle={styles.buttonContent}
                                    labelStyle={styles.buttonLabel}
                                >
                                    Set New Password
                                </Button>
                            )}

                            <TouchableOpacity
                                onPress={() => {
                                    setIsResetting(false);
                                    setError(null);
                                }}
                                style={{ marginTop: 16, alignItems: 'center' }}
                            >
                                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                                    Back to Sign In
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
                                autoComplete="name"
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
                            autoComplete="email"
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
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            left={<TextInput.Icon icon={() => <Lock size={20} color={theme.colors.onSurfaceVariant} />} />}
                            outlineColor="transparent"
                            activeOutlineColor={theme.colors.primary}
                        />

                        {!isSignUp && (
                            <TouchableOpacity onPress={startResetFlow} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>
                        )}

                        {emailTaken && (
                            <Card style={styles.noticeCard}>
                                <Card.Content style={styles.noticeContent}>
                                    <Text variant="titleMedium" style={styles.noticeTitle}>
                                        Email already in use
                                    </Text>
                                    <Text variant="bodySmall" style={styles.noticeBody}>
                                        That email is already registered. Try signing in below, or reset your password.
                                    </Text>
                                    <View style={styles.noticeActions}>
                                        <Button
                                            mode="contained"
                                            onPress={() => {
                                                setIsSignUp(false);
                                                setError(null);
                                            }}
                                            style={styles.noticeButton}
                                        >
                                            Sign In
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            onPress={startResetFlow}
                                            style={styles.noticeButton}
                                        >
                                            Reset Password
                                        </Button>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}

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
                            <TouchableOpacity onPress={toggleAuthMode}>
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
    noticeCard: {
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    noticeContent: {
        paddingVertical: 12,
    },
    noticeTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    noticeBody: {
        opacity: 0.7,
        marginBottom: 12,
    },
    noticeActions: {
        flexDirection: 'row',
        gap: 8,
    },
    noticeButton: {
        flex: 1,
        borderRadius: 12,
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
