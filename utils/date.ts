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
        };
        const currentDay = now.getDate();
        let currentShift = 0;
        if (currentDay < d1) currentShift = -1;
        else if (currentDay >= d2) currentShift = 1;
        const totalShifts = currentShift + offset;
        const addedMonths = Math.floor(totalShifts / 2);
        const normalizedShift = (totalShifts % 2 + 2) % 2;
        const targetMonthIndex = currentMonth + addedMonths;
        const targetDay = normalizedShift === 0 ? d1 : d2;
        const start = makeDate(currentYear, targetMonthIndex, targetDay);
        // End date is next period start - 1 day
        const nextShift = totalShifts + 1;
        const nextMonthAdd = Math.floor(nextShift / 2);
        const nextNormShift = (nextShift % 2 + 2) % 2;
        const nextDay = nextNormShift === 0 ? d1 : d2;
        const nextStart = makeDate(currentYear, currentMonth + nextMonthAdd, nextDay);
        const end = new Date(nextStart);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

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

    // If anchor date itself is in range, but we only add it if it's the primary instance.
    // Actually, let's just calculate all occurrences from the start of the interval to the end.

    if (!isRecurring) {
        if (a >= s && a <= e) return [a];
        return [];
    }

    // For recurring bills, we need to find instances between s and e.
    // We already have some logic in getRecurringDueDateForMonth, but let's make it robust.

    if (occurrence === 'Every Year') {
        // Check if the month and day match in any year within the range
        // Usually range is small (1 month or 15 days), so at most 1 instance.
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
            const targetYear = candidate.getFullYear();
            candidate.setDate(1);
            candidate.setMonth(targetMonth);
            const daysInMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
            candidate.setDate(Math.min(anchorDay, daysInMonth));
        }
    } else if (occurrence === 'Every Month' || occurrence === 'Installments') {
        const anchorDay = a.getDate();
        let candidate = new Date(a);
        const instEndDate = bill.installmentEndDate ? parseDate(bill.installmentEndDate) : null;
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
        // Usually 15 days apart. Let's assume anchor and anchor + 15
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
        
        // Start searching from whichever is earlier: anchor or start of interval
        // But we must respect the "Every Other Week" parity if applicable.
        let candidate = new Date(a);
        
        // Optimization: jump closer to 's'
        if (occurrence !== 'Every Other Week' && s > candidate) {
            const diff = s.getTime() - candidate.getTime();
            const weeksToJump = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
            candidate.setDate(candidate.getDate() + (weeksToJump * 7));
        }

        while (candidate <= e) {
            if (weekdays.includes(candidate.getDay())) {
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
            
            // Move to next day
            candidate.setDate(candidate.getDate() + 1);
            
            // If we have multiple days in a week, we check each day. 
            // If it's "Every Week" we just keep going.
        }
    }

    // Deduplicate and Sort
    return Array.from(new Set(results.map(d => d.getTime())))
        .sort((a, b) => a - b)
        .map(t => new Date(t));
};

/**
 * For a given bill + target month/year, returns the first recurring due date
 * that falls in that month, or null if the bill doesn't recur that month.
 */
export const getRecurringDueDateForMonth = (bill: Bill, monthIndex: number, year: number): Date | null => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const occurrences = getBillOccurrencesInInterval(bill, start, end);
    return occurrences.length > 0 ? occurrences[0] : null;
};

/**
 * Calculates the next due date for a recurring bill based on its occurrence type.
 * Returns null if there's no next date (e.g. one-time bills).
 */
export const calculateNextDueDate = (bill: Bill): Date | null => {
    // Start search window from today (or tomorrow if we want upcoming)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Look ahead 1 year maximum for the next instance
    const oneYearLater = new Date(tomorrow);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    const nextOccurrences = getBillOccurrencesInInterval(bill, tomorrow, oneYearLater);
    return nextOccurrences.length > 0 ? nextOccurrences[0] : null;
};

