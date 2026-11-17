import React from 'react';
import { View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { formStyles } from './formStyles';

interface Props extends React.ComponentProps<typeof TextInput> {
    value: string;
    maxLength: number;
    errorText?: string;
}

/** Text input with an inline error message and a character counter. */
export function CountedInput({ value, maxLength, errorText, style, ...rest }: Props) {
    const theme = useTheme();
    return (
        <View>
            <TextInput
                value={value}
                mode="outlined"
                style={[formStyles.input, style]}
                error={!!errorText}
                {...rest}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 }}>
                <Text variant="bodySmall" style={{ color: errorText ? theme.colors.error : theme.colors.onSurfaceVariant }}>
                    {errorText}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {value.length}/{maxLength}
                </Text>
            </View>
        </View>
    );
}
