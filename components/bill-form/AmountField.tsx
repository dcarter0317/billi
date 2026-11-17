import React from 'react';
import { View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { formStyles } from './formStyles';

interface Props {
    label: string;
    value: string;
    currencySymbol: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    error?: string;
    hint?: string;
}

/** Currency input with an inline error or hint. */
export function AmountField({ label, value, currencySymbol, onChangeText, onBlur, error, hint }: Props) {
    const theme = useTheme();
    const messageStyle = { color: theme.colors.error, marginLeft: 4, marginBottom: 12 };
    return (
        <View>
            <TextInput
                label={label}
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                mode="outlined"
                keyboardType="decimal-pad"
                style={formStyles.input}
                placeholder="0.00"
                left={<TextInput.Affix text={currencySymbol} />}
                contentStyle={{ paddingLeft: 24 }}
                error={!!error}
            />
            {!!error && <Text variant="bodySmall" style={messageStyle}>{error}</Text>}
            {!!hint && !error && <Text variant="bodySmall" style={messageStyle}>⚠ {hint}</Text>}
        </View>
    );
}
