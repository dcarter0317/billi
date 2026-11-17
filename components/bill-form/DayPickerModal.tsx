import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Button, Divider, useTheme } from 'react-native-paper';
import { formStyles } from './formStyles';
import { WEEKDAYS, isWeekly, toggleDueDay, getDayPickerHint } from '../../utils/billForm';

interface Props {
    visible: boolean;
    occurrence: string;
    dueDays: number[];
    onChange: (days: number[]) => void;
    onClose: () => void;
}

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Pick weekdays or days of the month, depending on the occurrence. */
export function DayPickerModal({ visible, occurrence, dueDays, onChange, onClose }: Props) {
    const theme = useTheme();
    const weekly = isWeekly(occurrence);
    // Weekdays are numbered from 0, days of the month from 1
    const options = weekly ? WEEKDAYS.map((label, value) => ({ label, value })) : MONTH_DAYS.map(d => ({ label: String(d), value: d }));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={formStyles.modalOverlay}>
                <View style={[formStyles.modalContent, { backgroundColor: theme.colors.surface, height: '80%' }]}>
                    <View style={formStyles.modalHeader}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                            Select {weekly ? 'Day of Week' : 'Day of Month'}
                        </Text>
                        <Button onPress={onClose}>Done</Button>
                    </View>
                    <Text variant="bodyMedium" style={{ marginBottom: 16, alignSelf: 'center', color: theme.colors.primary, fontWeight: '600' }}>
                        {getDayPickerHint(occurrence)}
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <ScrollView contentContainerStyle={styles.grid}>
                        {options.map(({ label, value }) => {
                            const isSelected = dueDays.includes(value);
                            return (
                                <TouchableOpacity
                                    key={label}
                                    style={[
                                        styles.dayItem,
                                        !weekly && styles.monthDay,
                                        { backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
                                    ]}
                                    onPress={() => onChange(toggleDueDay(dueDays, value, occurrence))}
                                >
                                    <Text style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingBottom: 40,
    },
    dayItem: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 8,
        borderRadius: 12,
    },
    monthDay: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
});
