import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Menu, List, useTheme, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePreferences } from '../context/UserPreferencesContext';

export default function PayPeriodSettings() {
    const theme = useTheme();
    const {
        preferences,
        setPayPeriodStart,
        setPayPeriodOccurrence,
        setPayPeriodSemiMonthlyDays
    } = usePreferences();

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [frequencyMenuVisible, setFrequencyMenuVisible] = useState(false);

    const [days, setDays] = useState<[string, string]>([
        preferences.payPeriodSemiMonthlyDays[0].toString(),
        preferences.payPeriodSemiMonthlyDays[1].toString()
    ]);

    // Update local state if preferences change externally
    React.useEffect(() => {
        setDays([
            preferences.payPeriodSemiMonthlyDays[0].toString(),
            preferences.payPeriodSemiMonthlyDays[1].toString()
        ]);
    }, [preferences.payPeriodSemiMonthlyDays]);

    const handleDayChange = (index: 0 | 1, value: string) => {
        // Update local state effectively allowing "free form" typing
        const newDaysState = [...days] as [string, string];
        newDaysState[index] = value;
        setDays(newDaysState);

        // Only update global preferences if it is a valid complete number
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1 && num <= 31) {
            const newPrefsDays = [...preferences.payPeriodSemiMonthlyDays] as [number, number];
            newPrefsDays[index] = num;
            setPayPeriodSemiMonthlyDays(newPrefsDays);
        }
    };

    const handleBlur = (index: 0 | 1) => {
        // On blur, if invalid, revert to saved preference
        const val = parseInt(days[index], 10);
        if (isNaN(val) || val < 1 || val > 31) {
            const newDaysState = [...days] as [string, string];
            newDaysState[index] = preferences.payPeriodSemiMonthlyDays[index].toString();
            setDays(newDaysState);
        }
    };

    return (
        <View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Pay Period Settings</Text>

            {preferences.payPeriodOccurrence !== 'semi-monthly' && (
                <View style={[styles.settingItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                    <Text variant="bodyLarge">Start Date</Text>
                    {Platform.OS === 'android' ? (
                        <Button
                            mode="outlined"
                            onPress={() => setShowDatePicker(true)}
                            textColor={theme.colors.primary}
                        >
                            {new Date(preferences.payPeriodStart).toLocaleDateString()}
                        </Button>
                    ) : (
                        <DateTimePicker
                            value={new Date(preferences.payPeriodStart)}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                if (selectedDate) setPayPeriodStart(selectedDate);
                            }}
                            themeVariant={preferences.isDarkMode ? 'dark' : 'light'}
                        />
                    )}
                </View>
            )}

            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={new Date(preferences.payPeriodStart)}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setPayPeriodStart(selectedDate);
                    }}
                />
            )}

            <Menu
                visible={frequencyMenuVisible}
                onDismiss={() => setFrequencyMenuVisible(false)}
                anchor={
                    <List.Item
                        title="Occurrence"
                        titleStyle={{ fontSize: 16 }}
                        description={preferences.payPeriodOccurrence.replace('-', ' ')}
                        descriptionStyle={{ textTransform: 'capitalize', color: theme.colors.primary }}
                        onPress={() => setFrequencyMenuVisible(true)}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        style={[styles.settingItem, { paddingVertical: 8, paddingHorizontal: 0 }]}
                    />
                }
            >
                <Menu.Item onPress={() => { setPayPeriodOccurrence('weekly'); setFrequencyMenuVisible(false); }} title="Weekly" />
                <Menu.Item onPress={() => { setPayPeriodOccurrence('bi-weekly'); setFrequencyMenuVisible(false); }} title="Bi-Weekly" />
                <Menu.Item onPress={() => { setPayPeriodOccurrence('monthly'); setFrequencyMenuVisible(false); }} title="Monthly" />
                <Menu.Item onPress={() => { setPayPeriodOccurrence('semi-monthly'); setFrequencyMenuVisible(false); }} title="Semi-monthly" />
            </Menu>

            {preferences.payPeriodOccurrence === 'semi-monthly' && (
                <View style={styles.semiMonthlyContainer}>
                    <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                        Select the two days of the month you get paid:
                    </Text>
                    <View style={styles.daysRow}>
                        <TextInput
                            mode="outlined"
                            label="Day 1"
                            value={days[0]}
                            onChangeText={(val) => handleDayChange(0, val)}
                            onBlur={() => handleBlur(0)}
                            keyboardType="number-pad"
                            style={styles.dayInput}
                            maxLength={2}
                        />
                        <TextInput
                            mode="outlined"
                            label="Day 2"
                            value={days[1]}
                            onChangeText={(val) => handleDayChange(1, val)}
                            onBlur={() => handleBlur(1)}
                            keyboardType="number-pad"
                            style={styles.dayInput}
                            maxLength={2}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '600',
        opacity: 0.7,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    },
    semiMonthlyContainer: {
        marginTop: 16,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 16,
    },
    dayInput: {
        flex: 1,
        backgroundColor: 'transparent',
    }
});
