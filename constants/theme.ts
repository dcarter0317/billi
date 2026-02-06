import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const commonColors = {
    primary: '#4c669f', // Soft Premium Blue
    onPrimary: '#FFFFFF',
    secondary: '#192f6a', // Deep Midnight Blue
    error: '#FF3B30',
    success: '#00af80', // Paid Green
};

export const BilliDarkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        ...commonColors,
        warning: '#FFCC00',
        background: '#0a0a12', // Very Dark Blue/Black
        surface: '#1c1c2e',
        surfaceVariant: '#2c2c3e',
        onSurface: '#ffffff',
        onSurfaceVariant: '#8b8b9a',
    },
    roundness: 8,
};

export const BilliLightTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...commonColors,
        warning: '#E6B400', // Darker Yellow for better contrast in light mode
        background: '#F5F7FA', // Light Grayish Blue
        surface: '#FFFFFF',
        surfaceVariant: '#E1E4E8',
        onSurface: '#1c1c2e',
        onSurfaceVariant: '#57606a',
    },
    roundness: 8,
};

// Default export for backward compatibility
export const BilliTheme = BilliDarkTheme;
