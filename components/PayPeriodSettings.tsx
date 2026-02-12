import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Menu, List, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePreferences } from '../context/UserPreferencesContext';

export default function PayPeriodSettings() {
    const theme = useTheme();
    const {
        preferences,
        setPayPeriodStart,
        setPayPeriodOccurrence
    } = usePreferences();

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [frequencyMenuVisible, setFrequencyMenuVisible] = useState(false);

    return (
        <View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Pay Period Settings</Text>

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
                        title="Frequency"
                        titleStyle={{ fontSize: 16 }}
                        description={preferences.payPeriodOccurrence}
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
            </Menu>
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
    }
});
