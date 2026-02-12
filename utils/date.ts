import { Bill } from '../context/BillContext';

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Data format: MM-DD-YYYY
// Data format: MM-DD-YYYY or ISO string or Date object
export const parseDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;

    // Try MM-DD-YYYY first
    const parts = String(date).split('-');
    if (parts.length === 3) {
        const [month, day, year] = parts.map(Number);
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            return new Date(year, month - 1, day);
        }
    }

    // Fallback to native Date parser (handles ISO, common strings)
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
};

export const getPayPeriodInterval = (
    startAnchor: any,
    frequency: 'weekly' | 'bi-weekly' | 'monthly',
    offset = 0
) => {
    const anchorDate = parseDate(startAnchor);
    const now = new Date();

    if (frequency === 'monthly') {
        const anchorDay = anchorDate.getDate();
        let targetMonth = now.getMonth() + offset;
        let targetYear = now.getFullYear();

        // If today is BEFORE the anchor day, the "current" (offset 0) period 
        // actually started last month.
        if (offset === 0 && now.getDate() < anchorDay) {
            targetMonth -= 1;
        }

        const start = new Date(targetYear, targetMonth, anchorDay);
        // Correct for month overflow (e.g. anchor 31 in Feb)
        if (start.getDate() !== anchorDay) {
            start.setDate(0);
        }

        const end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
        if (end.getDate() !== start.getDate()) {
            end.setDate(0);
        }
        // End is technically the day before the next period starts
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    // Weekly / Bi-weekly logic
    let periodLengthDays = frequency === 'weekly' ? 7 : 14;

    // Find how many periods between anchor and now
    const diffTime = now.getTime() - anchorDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Determine the start of the "current" (offset 0) period
    let periodsPassed = Math.floor(diffDays / periodLengthDays);

    // Total periods including offset
    const totalOffsetPeriods = periodsPassed + offset;

    const start = new Date(anchorDate);
    start.setDate(anchorDate.getDate() + (totalOffsetPeriods * periodLengthDays));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + periodLengthDays - 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};


export const getDisplayDate = (bill: Bill, filterPeriod: string, selectedMonth: number): string => {
    const billDate = parseDate(bill.dueDate);
    if (!bill.isRecurring) return bill.dueDate;

    const today = new Date();
    const currentYear = today.getFullYear();

    // Helper to project a date into the neighborhood of a target date
    const projectDate = (baseDate: Date, targetDate: Date) => {
        const result = new Date(baseDate);
        result.setFullYear(targetDate.getFullYear());
        result.setMonth(targetDate.getMonth());
        // Handle month overflow
        if (result.getMonth() !== targetDate.getMonth()) {
            result.setDate(0);
        }
        return result;
    };

    // 1. Monthly projection
    if (filterPeriod === 'monthly' && selectedMonth !== -1) {
        const target = new Date(currentYear, selectedMonth, 1);
        return formatDate(projectDate(billDate, target));
    }

    // 2. Interval projection (Last/This/Next period)
    const isInterval = ['last', 'this', 'next'].includes(filterPeriod);
    if (isInterval) {
        // If it's recurring, projecting into a pay period interval is tricky 
        // because a bill might occur multiple times or not at all depending on frequency.
        // For now, if the filter is "Next Pay Period", show the next likely occurrence.
        if (filterPeriod === 'next' && bill.isRecurring) {
            // Very simple advancement for display
            const next = new Date(billDate);
            if (bill.occurrence === 'Every Week') next.setDate(next.getDate() + 7);
            else if (bill.occurrence === 'Every Other Week') next.setDate(next.getDate() + 14);
            else next.setMonth(next.getMonth() + 1);
            return formatDate(next);
        }
    }

    return bill.dueDate;
};

export const getBillAlertStatus = (dueDateStr: string, bufferDays: number): 'overdue' | 'upcoming' | 'none' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseDate(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
        return 'overdue';
    }

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= bufferDays) {
        return 'upcoming';
    }

    return 'none';
};

export const getBillStatusColor = (bill: Bill, theme: any) => {
    if (bill.isPaid || bill.isCleared) {
        return theme.dark ? theme.colors.success : '#1B5E20';
    }
    const today = new Date();
    const dueDate = parseDate(bill.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return theme.colors.error;
    if (diffDays <= 2) {
        return theme.dark ? theme.colors.error : '#B71C1C';
    }
    return theme.dark ? (theme.colors as any).warning : '#E65100';
};
