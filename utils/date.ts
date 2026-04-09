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

    // Handle numeric timestamps or numeric strings
    if (typeof date === 'number') return new Date(date);
    if (typeof date === 'string' && /^\d+$/.test(date.trim())) {
        return new Date(parseInt(date.trim(), 10));
    }

    const str = String(date).trim();

    // 1. Try ISO-like YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }

    // 2. Try MM-DD-YYYY or MM/DD/YYYY
    const usMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (usMatch) {
        return new Date(parseInt(usMatch[3], 10), parseInt(usMatch[1], 10) - 1, parseInt(usMatch[2], 10));
    }

    // Fallback to native Date parser
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;

    // Last resort: try replacing all hyphens with slashes
    const slashed = new Date(str.replace(/-/g, '/'));
    if (!isNaN(slashed.getTime())) return slashed;

    console.warn(`[parseDate] Failed to parse: "${date}". Returning today.`);
    return new Date();
};

export const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
};

/**
 * Returns the start and end date for the anchor month range.
 * @param anchorDate The anchor date to align the range
 * @param offset Number of months to shift (default 0)
 */
export function getAnchorMonthRange(anchorDate: Date, offset = 0): { start: Date; end: Date } {
    const now = new Date();
    const anchorDay = anchorDate.getDate();
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();
    if (now.getDate() < anchorDay) {
        targetMonth -= 1;
        if (targetMonth < 0) {
            targetMonth = 11;
            targetYear -= 1;
        }
    }
    targetMonth += offset;
    while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
    }
    while (targetMonth > 11) {
        targetMonth -= 12;
        targetYear += 1;
    }
    const start = new Date(targetYear, targetMonth, anchorDay);
    if (start.getDate() !== anchorDay) {
        start.setDate(0);
    }
    const end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
    if (end.getDate() !== start.getDate()) {
        end.setDate(0);
    }
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}



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

/**
 * Returns all occurrences of a bill that fall within the given [start, end] interval.
 */
export const getBillOccurrencesInInterval = (bill: Bill, start: Date, end: Date): Date[] => {
    const occurrence = bill.occurrence;
    const isRecurring = bill.isRecurring ?? (occurrence ? occurrence !== 'One Time' : false);
    const anchorDate = parseDate(bill.dueDate);
    const results: Date[] = [];

    // Normalize dates to midnight for comparison
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(23, 59, 59, 999);
    const a = new Date(anchorDate); a.setHours(0, 0, 0, 0);

    if (!isRecurring) {
        if (a >= s && a <= e) return [a];
        return [];
    }

    // For recurring bills, we need to find instances between s and e.
    // We already have some logic in getRecurringDueDateForMonth, but let's make it robust.

    if (occurrence === 'Every Year') {
        const yearStart = s.getFullYear();
        const yearEnd = e.getFullYear();
        for (let y = yearStart; y <= yearEnd; y++) {
            const candidate = new Date(y, a.getMonth(), a.getDate());
            if (candidate >= s && candidate <= e && candidate >= a) {
                results.push(candidate);
            }
        }
    } else if (occurrence === 'Every Quarter') {
        const anchorDay = a.getDate();
        let candidate = new Date(a);
        while (candidate <= e) {
            if (candidate >= s && candidate >= a) {
                results.push(new Date(candidate));
            }
            // Move month then clamp to anchor day
            const targetMonth = candidate.getMonth() + 3;
            candidate.setDate(1);
            candidate.setMonth(targetMonth);
            const daysInMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
            candidate.setDate(Math.min(anchorDay, daysInMonth));
        }
    } else if (occurrence === 'Every Month' || occurrence === 'Installments') {
        const anchorDay = a.getDate();
        let candidate = new Date(a);
        const instEndDate = bill.installmentEndDate ? parseDate(bill.installmentEndDate) : undefined;
        const instRecurrence = occurrence === 'Installments' ? (bill.installmentRecurrence || 'monthly') : 'monthly';

        while (candidate <= e && (!instEndDate || candidate <= instEndDate)) {
            if (candidate >= s && candidate >= a) {
                results.push(new Date(candidate));
            }

            if (instRecurrence === 'bi-weekly') {
                candidate.setDate(candidate.getDate() + 14);
            } else {
                // Monthly with clamping
                const targetMonth = candidate.getMonth() + 1;
                candidate.setDate(1);
                candidate.setMonth(targetMonth);
                const daysInMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
                candidate.setDate(Math.min(anchorDay, daysInMonth));
            }
        }
    } else if (occurrence === 'Twice a Month') {
        const d1 = a.getDate();
        const d2 = (d1 + 15) > 30 ? (d1 - 15) : (d1 + 15);
        const days = [d1, d2].sort((x, y) => x - y);

        let curr = new Date(s.getFullYear(), s.getMonth(), 1);
        const loopEnd = new Date(e.getFullYear(), e.getMonth() + 1, 1);

        while (curr < loopEnd) {
            for (const d of days) {
                const candidate = new Date(curr.getFullYear(), curr.getMonth(), d);
                // Clamp to last day of month
                if (candidate.getMonth() !== curr.getMonth()) {
                    candidate.setDate(0);
                }
                if (candidate >= s && candidate <= e && candidate >= a) {
                    results.push(candidate);
                }
            }
            curr.setMonth(curr.getMonth() + 1);
        }
    } else if (occurrence === 'Every Week' || occurrence === 'Twice a Week' || occurrence === 'Every Other Week') {
        const weekdays = (bill.dueDays && bill.dueDays.length > 0) ? bill.dueDays : [a.getDay()];

        let candidate = new Date(a);

        // Optimization: jump closer to 's'
        if (occurrence !== 'Every Other Week' && s > candidate) {
            const diff = s.getTime() - candidate.getTime();
            const weeksToJump = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
            candidate.setDate(candidate.getDate() + (weeksToJump * 7));
        }

        while (candidate <= e) {
            if (weekdays && weekdays.includes(candidate.getDay())) {
                if (candidate >= s && candidate >= a) {
                    // Check parity for Every Other Week
                    if (occurrence === 'Every Other Week') {
                        const diffDays = Math.floor((candidate.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
                        if (Math.floor(diffDays / 7) % 2 === 0) {
                            results.push(new Date(candidate));
                        }
                    } else {
                        results.push(new Date(candidate));
                    }
                }
            }
            candidate.setDate(candidate.getDate() + 1);
        }
    }

    // Deduplicate and Sort
    return Array.from(new Set(results.map(d => d.getTime())))
        .sort((a, b) => a - b)
        .map(t => new Date(t));
};

// Returns the start and end dates for a pay period based on user preferences
export function getPayPeriodInterval(
    payPeriodStart: string | Date,
    payPeriodOccurrence: string,
    offset: number = 0,
    semiMonthlyDays?: number[]
): { start: Date; end: Date } {
    // payPeriodStart: the anchor date (string or Date)
    // payPeriodOccurrence: 'Monthly', 'Bi-Weekly', 'Weekly', 'Semi-Monthly', etc.
    // offset: -1 for last, 0 for current, 1 for next
    // semiMonthlyDays: [1, 15] or similar, for semi-monthly periods

    let anchor = parseDate(payPeriodStart);
    let start: Date, end: Date;

    if (payPeriodOccurrence === 'Monthly') {
        // Move anchor by offset months
        start = new Date(anchor.getFullYear(), anchor.getMonth() + offset, anchor.getDate());
        end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
        end.setDate(end.getDate() - 1); // last day of period
    } else if (payPeriodOccurrence === 'Bi-Weekly') {
        // Each period is 14 days
        start = new Date(anchor);
        start.setDate(start.getDate() + offset * 14);
        end = new Date(start);
        end.setDate(start.getDate() + 13);
    } else if (payPeriodOccurrence === 'Weekly') {
        start = new Date(anchor);
        start.setDate(start.getDate() + offset * 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
    } else if (payPeriodOccurrence === 'Semi-Monthly' && semiMonthlyDays && semiMonthlyDays.length === 2) {
        // e.g., [1, 15]
        const [d1, d2] = semiMonthlyDays;
        // Figure out which period this offset refers to
        // offset = 0: current, -1: last, 1: next
        // We'll assume d1 < d2
        let baseMonth = anchor.getMonth();
        let baseYear = anchor.getFullYear();
        let periodIndex = 0; // 0 for first, 1 for second
        if (offset !== 0) {
            // Move by offset periods
            let totalPeriods = offset;
            baseMonth += Math.floor(totalPeriods / 2);
            periodIndex = totalPeriods % 2;
            if (periodIndex < 0) {
                periodIndex += 2;
                baseMonth -= 1;
            }
        }
        if (periodIndex === 0) {
            start = new Date(baseYear, baseMonth, d1);
            end = new Date(baseYear, baseMonth, d2 - 1);
        } else {
            start = new Date(baseYear, baseMonth, d2);
            // End is last day of month
            end = new Date(baseYear, baseMonth + 1, 0);
        }
    } else {
        // Default: just return the anchor date as both start and end
        start = new Date(anchor);
        end = new Date(anchor);
    }
    // Normalize times
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};


