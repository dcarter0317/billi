import React from 'react';
import { View, Modal, Platform } from 'react-native';
import { Text, Button, Divider, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formStyles } from './formStyles';

interface Props {
    visible: boolean;
    title: string;
    value: Date;
    onChange: (date: Date) => void;
    onClose: () => void;
}

/** Date picker: a bottom sheet with a spinner on iOS, the system dialog on Android. */
export function DatePickerModal({ visible, title, value, onChange, onClose }: Props) {
    const theme = useTheme();
    if (!visible) return null;

    if (Platform.OS !== 'ios') {
        return (
            <DateTimePicker
                value={value}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                    onClose();
                    if (selected) onChange(selected);
                }}
            />
        );
    }

    return (
        <Modal transparent animationType="slide" visible onRequestClose={onClose}>
            <View style={formStyles.modalOverlay}>
                <View style={[formStyles.modalContent, { backgroundColor: theme.colors.surface, height: 'auto', paddingBottom: 40 }]}>
                    <View style={formStyles.modalHeader}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{title}</Text>
                        <Button onPress={onClose}>Done</Button>
                    </View>
                    <Divider />
                    <DateTimePicker
                        value={value}
                        mode="date"
                        display="spinner"
                        onChange={(_, selected) => selected && onChange(selected)}
                        textColor={theme.colors.onSurface}
                    />
                </View>
            </View>
        </Modal>
    );
}
