import type { Bill } from '../context/BillContext';
import { formatDate } from './date';
import { formatAmount } from './currency';

export type Occurrence = NonNullable<Bill['occurrence']>;

export const OCCURRENCES: Occurrence[] = [
    'One Time', 'Every Month', 'Every Week', 'Twice a Week', 'Twice a Month',
    'Every Other Week', 'Every Quarter', 'Every Year', 'Installments',
];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** True when due days are weekdays (0 to 6) rather than days of the month (1 to 31). */
export const isWeekly = (occurrence: string) => occurrence.includes('Week');

export function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/** How many days the picker should ask for, shown as helper text. */
export function getDayPickerHint(occurrence: string): string {
    if (occurrence === 'Twice a Month' || occurrence === 'Twice a Week') return 'Select 2 days';
    if (occurrence === 'Every Month' || occurrence === 'Installments' || occurrence === 'Every Week') return 'Select 1 day';
    return 'Select day(s)';
}

/** Toggles a due day on or off, enforcing how many days each occurrence allows. */
export function toggleDueDay(dueDays: number[], day: number, occurrence: string): number[] {
    let next = [...dueDays];
    if (next.includes(day)) {
        next = next.filter(d => d !== day);
    } else if (isWeekly(occurrence)) {
        next = occurrence === 'Every Week' ? [day] : [...next, day];
        if (occurrence === 'Twice a Week' && next.length > 2) next.shift();
    } else if (occurrence === 'Every Month' || occurrence === 'Installments') {
        next = [day];
    } else if (occurrence === 'Twice a Month') {
        if (next.length >= 2) next.shift();
        next.push(day);
    } else {
        next.push(day);
    }
    return next.sort((a, b) => a - b);
}

/** Next due date for the chosen days. Monthly style bills keep the current month. */
export function calculateNextDueDate(days: number[], occurrence: string): Date {
    const today = new Date();
    const next = new Date(today);
    const sorted = [...days].sort((a, b) => a - b);

    if (isWeekly(occurrence)) {
        const currentDay = today.getDay();
        const upcoming = sorted.find(d => d >= currentDay);
        if (upcoming !== undefined) {
            next.setDate(today.getDate() + (upcoming - currentDay));
        } else {
            next.setDate(today.getDate() + (7 - currentDay + sorted[0]));
        }
    } else if (
        occurrence.includes('Month') || occurrence === 'Installments' ||
        occurrence === 'Every Quarter' || occurrence === 'Every Year'
    ) {
        // Bill lifecycle advances the date when the bill is paid
        next.setDate(sorted[0]);
    }
    return next;
}

/** Last installment date, formatted, or an empty string when the count is not valid. */
export function calculateInstallmentEndDate(
    start: Date,
    totalInstallments: string,
    recurrence: Bill['installmentRecurrence'],
): string {
    const count = parseInt(totalInstallments);
    if (!(count > 0)) return '';
    const end = new Date(start);
    if (recurrence === 'monthly') end.setMonth(end.getMonth() + (count - 1));
    else if (recurrence === 'bi-weekly') end.setDate(end.getDate() + (count - 1) * 14);
    return formatDate(end);
}

export function calculateRemainingBalance(totalAmount: string, installmentAmount: string, paidInstallments: string): number {
    return (parseFloat(totalAmount) || 0) - (parseFloat(installmentAmount) || 0) * (parseInt(paidInstallments) || 0);
}

export interface BillFormValues {
    title: string;
    amount: string;
    date: Date;
    category: string;
    isPaid: boolean;
    isCleared: boolean;
    occurrence: Occurrence;
    dueDays: number[];
    notes: string;
    totalInstallments: string;
    paidInstallments: string;
    installmentTotalAmount: string;
    installmentStartDate: Date;
    installmentEndDate: string;
    installmentRecurrence: Bill['installmentRecurrence'];
}

/** Builds the bill saved to the database from the form values. */
export function buildBillPayload(v: BillFormValues, isEdit: boolean): Omit<Bill, 'id'> {
    const isInstallments = v.occurrence === 'Installments';
    return {
        title: v.title,
        amount: formatAmount(v.amount),
        dueDate: formatDate(v.date),
        category: v.category,
        isPaid: v.isPaid,
        isCleared: v.isCleared,
        occurrence: v.occurrence,
        dueDays: v.dueDays,
        notes: v.notes,
        totalInstallments: isInstallments ? parseInt(v.totalInstallments) || 0 : undefined,
        paidInstallments: isInstallments ? parseInt(v.paidInstallments) || 0 : (isEdit ? undefined : 0),
        totalInstallmentAmount: isInstallments ? formatAmount(v.installmentTotalAmount) : undefined,
        installmentStartDate: isInstallments ? formatDate(v.installmentStartDate) : undefined,
        installmentEndDate: isInstallments ? v.installmentEndDate : undefined,
        installmentRecurrence: isInstallments ? v.installmentRecurrence : undefined,
        remainingBalance: isInstallments
            ? formatAmount(calculateRemainingBalance(v.installmentTotalAmount, v.amount, v.paidInstallments))
            : undefined,
    };
}
