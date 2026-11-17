import React from 'react';
import { View } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { Bill } from '../../context/BillContext';
import { formatDate } from '../../utils/date';
import { formatAmount } from '../../utils/currency';
import { calculateRemainingBalance } from '../../utils/billForm';
import { AmountField } from './AmountField';
import { PressableField } from './PressableField';
import { formStyles } from './formStyles';

interface Props {
    currencySymbol: string;
    totalAmount: string;
    onTotalAmountChange: (text: string) => void;
    amount: string;
    onAmountChange: (text: string) => void;
    onAmountBlur: () => void;
    amountError?: string;
    amountHint?: string;
    totalInstallments: string;
    onTotalInstallmentsChange: (text: string) => void;
    paidInstallments: string;
    onPaidInstallmentsChange: (text: string) => void;
    recurrence: Bill['installmentRecurrence'];
    onRecurrenceChange: (recurrence: NonNullable<Bill['installmentRecurrence']>) => void;
    startDate: Date;
    onPressStartDate: () => void;
    endDate: string;
}

const digitsOnly = (text: string) => text.replace(/[^0-9]/g, '');

/** Form fields that only apply to the Installments occurrence. */
export function InstallmentFields(p: Props) {
    const theme = useTheme();
    const paid = parseInt(p.paidInstallments) || 0;

    return (
        <View>
            <TextInput
                label="Total Installment Amount"
                value={p.totalAmount}
                onChangeText={p.onTotalAmountChange}
                mode="outlined"
                keyboardType="decimal-pad"
                style={formStyles.input}
                placeholder="0.00"
                left={<TextInput.Affix text={p.currencySymbol} />}
                contentStyle={{ paddingLeft: 24 }}
            />

            <AmountField
                label="Installment Amount"
                value={p.amount}
                currencySymbol={p.currencySymbol}
                onChangeText={p.onAmountChange}
                onBlur={p.onAmountBlur}
                error={p.amountError}
                hint={p.amountHint}
            />

            <TextInput
                label="Total Number of Installments"
                value={p.totalInstallments}
                onChangeText={(text) => p.onTotalInstallmentsChange(digitsOnly(text))}
                mode="outlined"
                keyboardType="number-pad"
                style={formStyles.input}
                placeholder="e.g. 4"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                    label="Paid Installments"
                    value={p.paidInstallments}
                    onChangeText={(text) => p.onPaidInstallmentsChange(digitsOnly(text))}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={[formStyles.input, { flex: 1 }]}
                    placeholder="0"
                />
                <View style={{ flexDirection: 'row', gap: 5 }}>
                    <IconButton
                        icon="minus"
                        mode="contained"
                        size={24}
                        onPress={() => p.onPaidInstallmentsChange(Math.max(0, paid - 1).toString())}
                    />
                    <IconButton
                        icon="plus"
                        mode="contained"
                        size={24}
                        onPress={() => p.onPaidInstallmentsChange(Math.min(parseInt(p.totalInstallments) || Infinity, paid + 1).toString())}
                    />
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Installment Recurrence</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                        mode={p.recurrence === 'bi-weekly' ? 'contained' : 'outlined'}
                        onPress={() => p.onRecurrenceChange('bi-weekly')}
                        style={{ flex: 1 }}
                    >
                        Bi-Weekly
                    </Button>
                    <Button
                        mode={p.recurrence === 'monthly' ? 'contained' : 'outlined'}
                        onPress={() => p.onRecurrenceChange('monthly')}
                        style={{ flex: 1 }}
                    >
                        Monthly
                    </Button>
                </View>
            </View>

            <PressableField label="Start Date" value={formatDate(p.startDate)} icon="calendar" onPress={p.onPressStartDate} />

            <TextInput
                label="End Date (Calculated)"
                value={p.endDate}
                mode="outlined"
                style={[formStyles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                editable={false}
                right={<TextInput.Icon icon="calendar-lock" />}
            />

            {!!p.totalAmount && !!p.amount && (
                <View style={{
                    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 16,
                    borderWidth: 1, borderStyle: 'dashed',
                    backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant,
                }}>
                    <Text variant="labelLarge" style={{ color: theme.dark ? '#FFFFFF' : theme.colors.onSurfaceVariant }}>Remaining Balance</Text>
                    <Text variant="headlineSmall" style={{ color: theme.dark ? '#FFFFFF' : theme.colors.primary, fontWeight: 'bold' }}>
                        {p.currencySymbol}{formatAmount(calculateRemainingBalance(p.totalAmount, p.amount, p.paidInstallments))}
                    </Text>
                </View>
            )}
        </View>
    );
}
