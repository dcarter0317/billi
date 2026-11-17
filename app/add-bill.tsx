import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Switch } from 'react-native';
import { Text, Button, useTheme, Card, Divider, Checkbox, Snackbar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../context/UserPreferencesContext';
import { formatDate } from '../utils/date';
import { getCurrencySymbol } from '../utils/currency';
import { CATEGORIES } from '../constants/categories';
import { OCCURRENCES, WEEKDAYS, isWeekly, getOrdinalSuffix } from '../utils/billForm';
import { useBillForm } from '../hooks/useBillForm';
import { AmountField } from '../components/bill-form/AmountField';
import { CountedInput } from '../components/bill-form/CountedInput';
import { PressableField } from '../components/bill-form/PressableField';
import { PickerModal } from '../components/bill-form/PickerModal';
import { DayPickerModal } from '../components/bill-form/DayPickerModal';
import { DatePickerModal } from '../components/bill-form/DatePickerModal';
import { InstallmentFields } from '../components/bill-form/InstallmentFields';
import { RecurrenceWarningModal } from '../components/bill-form/RecurrenceWarningModal';
import { formStyles } from '../components/bill-form/formStyles';

export default function AddBillScreen() {
    const theme = useTheme();
    const { preferences } = usePreferences();
    const currencySymbol = getCurrencySymbol(preferences.currency);
    const form = useBillForm();

    const [showOccurrencePicker, setShowOccurrencePicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);

    const { occurrence, fieldErrors, fieldHints } = form;
    const weekly = isWeekly(occurrence);
    const dueDaysLabel = form.dueDays.length > 0
        ? form.dueDays.map(d => weekly ? WEEKDAYS[d] : d + getOrdinalSuffix(d)).join(', ')
        : 'Select days';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}
                style={{ flex: 1 }}
            >
                <ScrollView ref={form.scrollViewRef} contentContainerStyle={styles.content}>
                    <Text variant="headlineSmall" style={styles.title}>
                        {form.isEdit ? 'Edit Bill' : 'Bill Details'}
                    </Text>

                    <Card style={styles.formCard}>
                        <Card.Content>
                            <CountedInput
                                label="Payee"
                                value={form.title}
                                maxLength={100}
                                onChangeText={form.changeTitle}
                                onBlur={() => form.validateField('title', form.title)}
                                placeholder="e.g. Electric Company"
                                errorText={fieldErrors.title}
                            />

                            {occurrence !== 'Installments' && (
                                <AmountField
                                    label="Amount"
                                    value={form.amount}
                                    currencySymbol={currencySymbol}
                                    onChangeText={form.changeAmount}
                                    onBlur={() => form.validateField('amount', form.amount)}
                                    error={fieldErrors.amount}
                                    hint={fieldHints.amount}
                                />
                            )}

                            <PressableField label="Occurrence" value={occurrence} icon="repeat" onPress={() => setShowOccurrencePicker(true)} />

                            {occurrence === 'Installments' ? (
                                <InstallmentFields
                                    currencySymbol={currencySymbol}
                                    totalAmount={form.installmentTotalAmount}
                                    onTotalAmountChange={form.setInstallmentTotalAmount}
                                    amount={form.amount}
                                    onAmountChange={form.changeAmount}
                                    onAmountBlur={() => form.validateField('amount', form.amount)}
                                    amountError={fieldErrors.amount}
                                    amountHint={fieldHints.amount}
                                    totalInstallments={form.totalInstallments}
                                    onTotalInstallmentsChange={form.setTotalInstallments}
                                    paidInstallments={form.paidInstallments}
                                    onPaidInstallmentsChange={form.setPaidInstallments}
                                    recurrence={form.installmentRecurrence}
                                    onRecurrenceChange={form.setInstallmentRecurrence}
                                    startDate={form.installmentStartDate}
                                    onPressStartDate={() => setShowStartDatePicker(true)}
                                    endDate={form.installmentEndDate}
                                />
                            ) : (
                                <View>
                                    <PressableField
                                        label={weekly ? 'Repeats On' : 'Due Day'}
                                        value={dueDaysLabel}
                                        icon="calendar-text"
                                        onPress={() => setShowDayPicker(true)}
                                    />
                                    {occurrence === 'Every Month' && (
                                        <TextInput
                                            label="Next Due Date"
                                            value={formatDate(form.date)}
                                            mode="outlined"
                                            style={[formStyles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                                            editable={false}
                                            right={<TextInput.Icon icon="calendar-lock" />}
                                        />
                                    )}
                                </View>
                            )}

                            <PressableField label="Category" value={form.category} icon="chevron-down" onPress={() => setShowCategoryPicker(true)} />

                            {form.category === 'Custom' && (
                                <TextInput
                                    label="Custom Category Name"
                                    value={form.customCategory}
                                    onChangeText={form.setCustomCategory}
                                    mode="outlined"
                                    style={formStyles.input}
                                    placeholder="e.g. Server Hosting"
                                />
                            )}

                            <Divider style={{ marginVertical: 16 }} />

                            <View style={styles.switchRow}>
                                <Text variant="bodyLarge">Is Paid</Text>
                                <Switch
                                    value={form.isPaid}
                                    onValueChange={form.setIsPaid}
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                    thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
                                />
                            </View>

                            <View style={styles.checkboxRow}>
                                <Checkbox.Android
                                    status={form.isCleared ? 'checked' : 'unchecked'}
                                    onPress={() => form.setIsCleared(!form.isCleared)}
                                    color={theme.colors.primary}
                                />
                                <TouchableOpacity onPress={() => form.setIsCleared(!form.isCleared)}>
                                    <Text variant="bodyLarge">Payment Cleared</Text>
                                </TouchableOpacity>
                            </View>

                            <Divider style={{ marginVertical: 16 }} />

                            <CountedInput
                                label="Notes"
                                value={form.notes}
                                maxLength={500}
                                onChangeText={form.changeNotes}
                                onBlur={() => form.validateField('notes', form.notes)}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 100 }}
                                placeholder="Add notes about this bill..."
                                errorText={fieldErrors.notes}
                            />
                        </Card.Content>
                    </Card>

                    <Button
                        mode="contained"
                        loading={form.saving}
                        disabled={form.saving}
                        onPress={form.save}
                        style={styles.saveButton}
                        contentStyle={styles.saveButtonContent}
                    >
                        {form.isEdit ? 'Update Bill' : 'Add Bill'}
                    </Button>

                    <Button mode="text" onPress={form.goBack} style={styles.cancelButton}>
                        Cancel
                    </Button>
                </ScrollView>

                <Snackbar
                    visible={form.snackbar.visible}
                    onDismiss={form.dismissSnackbar}
                    duration={form.snackbar.type === 'success' ? 2000 : 4000}
                    style={{ backgroundColor: form.snackbar.type === 'success' ? theme.colors.primary : theme.colors.error }}
                >
                    <Text style={{ color: '#fff' }}>{form.snackbar.message}</Text>
                </Snackbar>

                <PickerModal
                    visible={showOccurrencePicker}
                    title="Select Occurrence"
                    options={OCCURRENCES}
                    selected={occurrence}
                    onSelect={form.changeOccurrence}
                    onClose={() => setShowOccurrencePicker(false)}
                />
                <PickerModal
                    visible={showCategoryPicker}
                    title="Select Category"
                    options={CATEGORIES}
                    selected={form.category}
                    onSelect={form.changeCategory}
                    onClose={() => setShowCategoryPicker(false)}
                />
                <DayPickerModal
                    visible={showDayPicker}
                    occurrence={occurrence}
                    dueDays={form.dueDays}
                    onChange={form.setDueDays}
                    onClose={() => setShowDayPicker(false)}
                />
                <DatePickerModal
                    visible={showStartDatePicker}
                    title="Select Start Date"
                    value={form.installmentStartDate}
                    onChange={form.setInstallmentStartDate}
                    onClose={() => setShowStartDatePicker(false)}
                />
                <RecurrenceWarningModal
                    change={form.recurrenceWarning}
                    onCancel={form.cancelRecurrenceChange}
                    onConfirm={form.confirmRecurrenceChange}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 150,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 20,
    },
    formCard: {
        marginBottom: 24,
    },
    saveButton: {
        borderRadius: 12,
        marginBottom: 12,
    },
    saveButtonContent: {
        paddingVertical: 8,
    },
    cancelButton: {
        marginTop: 8,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
