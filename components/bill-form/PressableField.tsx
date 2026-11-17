import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import { formStyles } from './formStyles';

interface Props {
    label: string;
    value: string;
    icon: string;
    onPress: () => void;
}

/** Read only input that opens a picker when tapped. */
export function PressableField({ label, value, icon, onPress }: Props) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <View pointerEvents="none">
                <TextInput
                    label={label}
                    value={value}
                    mode="outlined"
                    style={formStyles.input}
                    editable={false}
                    right={<TextInput.Icon icon={icon} />}
                />
            </View>
        </TouchableOpacity>
    );
}
