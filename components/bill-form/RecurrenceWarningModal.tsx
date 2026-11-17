import React from 'react';
import { View, Modal } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { formStyles } from './formStyles';

interface Props {
    change: { oldType: string; newType: string } | null;
    onCancel: () => void;
    onConfirm: () => void;
}

/** Confirms a recurrence change on an existing bill. */
export function RecurrenceWarningModal({ change, onCancel, onConfirm }: Props) {
    const theme = useTheme();
    if (!change) return null;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
            <View style={[formStyles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 20 }]}>
                <View style={[formStyles.modalContent, { backgroundColor: theme.colors.surface, padding: 24, borderRadius: 12 }]}>
                    <Text variant="titleLarge" style={{ marginBottom: 16, fontWeight: 'bold' }}>Change Recurrence?</Text>
                    <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
                        Changing recurrence will reschedule all future occurrences from {change.oldType} to {change.newType}. This cannot be undone. Continue?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                        <Button mode="outlined" onPress={onCancel}>Cancel</Button>
                        <Button mode="contained" onPress={onConfirm}>Continue</Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
