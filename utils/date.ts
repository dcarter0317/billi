import { Bill } from '../context/BillContext';

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Data format: MM-DD-YYYY
export const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();

    const [month, day, year] = parts.map(Number);
    // Basic validation
    if (isNaN(month) || isNaN(day) || isNaN(year)) return new Date();

    return new Date(year, month - 1, day);
};

export const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
};

export const getPayPeriodInterval = (
    startAnchor: number,
    frequency: 'weekly' | 'bi-weekly' | 'monthly',
    offset = 0
) => {
    const anchorDate = new Date(startAnchor);
    // Fallback if anchor is invalid
    if (isNaN(anchorDate.getTime())) {
        const now = new Date();
        return { start: now, end: now };
    }

    const now = new Date();

    // Calculate days since anchor
    const diffTime = now.getTime() - anchorDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let periodLengthDays = 14; // Default bi-weekly
    if (frequency === 'weekly') periodLengthDays = 7;
    if (frequency === 'monthly') {
        // Monthly logic
        const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);

        // Start date: anchor day in target month
        const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), anchorDate.getDate());

        // Handle month wrapping issues (e.g. Feb 30 -> Mar 2)
        // If the month of 'start' is different than 'targetDate', it means we overflowed.
        // Clamp to the last day of the target month.
        if (start.getMonth() !== targetDate.getMonth()) {
            start.setDate(0); // This sets it to the last day of the previous month (relative to overflow), i.e. correct month end
        }

        const end = new Date(start);
        end.setMonth(start.getMonth() + 1);
        // Correct end date calculation: same day next month, then minus 1 day
        // But we need to handle if next month doesn't have that day too.
        // Actually, pay period is usually "Start Date to Start Date - 1 day".
        // Let's use simpler logic: 
        // End is Start + 1 Month - 1 Day. 

        // Re-calculate end carefully
        const nextMonthStart = new Date(start);
        nextMonthStart.setMonth(start.getMonth() + 1);
        if (nextMonthStart.getDate() !== start.getDate()) {
            // Overflowed again (e.g. Jan 31 + 1 Month -> Feb 28/29)
            nextMonthStart.setDate(0);
        }

        end.setTime(nextMonthStart.getTime() - (24 * 60 * 60 * 1000)); // Subtract one day

        return { start, end };
    }

    const periodsPassed = Math.floor(diffDays / periodLengthDays) + offset;

    const start = new Date(anchorDate);
    start.setDate(anchorDate.getDate() + (periodsPassed * periodLengthDays));

    const end = new Date(start);
    end.setDate(start.getDate() + periodLengthDays - 1);

    return { start, end };
};


export const getDisplayDate = (bill: Bill, filterPeriod: string, selectedMonth: number): string => {
    if (!bill.isRecurring) return bill.dueDate;

    const billDate = parseDate(bill.dueDate);
    const today = new Date();
    const currentYear = today.getFullYear();

    if (filterPeriod === 'monthly' && selectedMonth !== -1) {
        // Project to the selected month if it's in the future
        if (selectedMonth > billDate.getMonth() || billDate.getFullYear() < currentYear) {
            const projectedDate = new Date(currentYear, selectedMonth, billDate.getDate());
            // Handle month overflow (e.g., Feb 30)
            if (projectedDate.getMonth() !== selectedMonth) {
                projectedDate.setDate(0);
            }
            return formatDate(projectedDate);
        }
    }

    // For other periods (Weekly, Bi-weekly), we could add more complex projection logic here
    // For now, returning the base due date if not a monthly projection
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
    if (bill.isPaid) {
        return theme.dark ? theme.colors.success : '#1B5E20'; // Darker Green in light mode
    }
    const today = new Date();
    const dueDate = parseDate(bill.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) {
        return theme.dark ? theme.colors.error : '#B71C1C'; // Darker Red in light mode
    }
    return theme.dark ? (theme.colors as any).warning : '#E65100'; // Darker Amber/Orange in light mode
};
