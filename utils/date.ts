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
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly',
    offset = 0,
    semiMonthlyDays: [number, number] = [15, 30] // Default fallback
) => {
    const anchorDate = parseDate(startAnchor);
    const now = new Date();
    // Normalize now
    now.setHours(0, 0, 0, 0);

    if (frequency === 'semi-monthly') {
        // 1. Sort the two days just in case
        const days = [...semiMonthlyDays].sort((a, b) => a - b);
        const [d1, d2] = days;

        // 2. Identify all possible start dates around "now" to find the current one (offset=0)
        // Candidates:
        // - PrevMonth.d2
        // - CurrMonth.d1
        // - CurrMonth.d2
        // - NextMonth.d1
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Helper to safely create date (handling variable days like 30, 31)
        const makeDate = (year: number, month: number, day: number) => {
            const d = new Date(year, month, day);
            // If valid day (e.g. Feb 30 -> Mar 2), we want to clamp or wrap?
            // "Paycheck on 30th" usually means "Last day of month" if month < 30 days.
            // For simplicity, let's clamp to last day of month if overflow.
            const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
            if (day > lastDayOfTargetMonth) {
                d.setDate(lastDayOfTargetMonth);
            }
            return d;
        };

        const candidates = [
            makeDate(currentYear, currentMonth - 1, d2), // Prev D2
            makeDate(currentYear, currentMonth, d1),     // Curr D1
            makeDate(currentYear, currentMonth, d2),     // Curr D2
            makeDate(currentYear, currentMonth + 1, d1)  // Next D1
        ];

        // Find the "Current" period start: the latest date <= now
        let currentIndex = -1;
        for (let i = 0; i < candidates.length; i++) {
            if (candidates[i] <= now) {
                currentIndex = i;
            } else {
                break;
            }
        }

        // Apply offset
        // We want to move `offset` periods from candidates[currentIndex]
        // But since we only generated 4 candidates, we need a robust way to calculate ANY offset.

        // Robust approach:
        // Calculate total months passed + periods passed.
        // Base: Current Month, D1.
        // If now < Curr.D1, we are in Prev.D2 period (Period -1 relative to Curr.D1).
        // If now >= Curr.D1 and < Curr.D2, we are in Curr.D1 period (Period 0).
        // If now >= Curr.D2, we are in Curr.D2 period (Period 1).

        let basePeriod = 0;
        if (now.getDate() < d1) basePeriod = -1;
        else if (now.getDate() >= d2) basePeriod = 1;

        // Target period index relative to "Current Month D1"
        const targetPeriodIndex = basePeriod + offset;

        // Calculate target month and which pay day (d1 or d2)
        // Groups of 2 periods per month.
        // floor(targetPeriodIndex / 2) = months to add
        // targetPeriodIndex % 2 = which day (0 -> d1, 1 -> d2)

        const monthsToAdd = Math.floor(targetPeriodIndex / 2);
        const isSecondPeriod = (Math.abs(targetPeriodIndex) % 2 === 1)
            ? (targetPeriodIndex < 0 ? basePeriod === 1 : true) // tricky math for negative modulo
            // Simpler: just check parity of targetPeriodIndex
            : false;

        // Let's simplify:
        // periods are ordered 0, 1, 2, 3...
        // 0 = Month 0, Day 1
        // 1 = Month 0, Day 2
        // 2 = Month 1, Day 1

        // Find "Period 0" absolute index relative to some epoch? No.

        // Let's use the iterative approach from known current start.
        // Start from Current Month D1.
        const startOfThisMonthD1 = makeDate(currentYear, currentMonth, d1);
        let periodsShift = 0;

        if (now < startOfThisMonthD1) {
            // We are before D1, so we are in prev month D2 loop? 
            // Actually let's trust the logic:
            // If today is 5th (and D1=15), we want the period starting last month 30th.
        }

        // New Robust logic:
        // 1. Establish a "Reference Start" = Current Month, D1.
        // 2. Determine "Periods away from reference" for *current* state.
        //    - If today < D1: -1 (Reference is future, so current is -1 i.e. Prev D2)
        //    - If today >= D1 && today < D2: 0 (Current is Reference)
        //    - If today >= D2: 1 (Current is next one)
        // 3. Add `offset` to this value. -> `totalShifts`
        // 4. Calculate new date from Reference + `totalShifts`.

        const currentDay = now.getDate();
        let currentShift = 0;
        if (currentDay < d1) currentShift = -1;
        else if (currentDay >= d2) currentShift = 1;

        const totalShifts = currentShift + offset;

        // Apply shifts
        // integer division by 2 for months
        // remainder for day swap

        const addedMonths = Math.floor(totalShifts / 2);
        const remainder = totalShifts % 2;

        // Javascript modulo bug with negatives: -1 % 2 = -1. We want canonical modulus.
        // Actually, logic is:
        // Even shift (0, 2, -2) -> Same day type (D1)
        // Odd shift (1, -1) -> Other day type (D2)

        let targetMonthIndex = currentMonth + addedMonths;
        let targetDay = d1;

        // If totalShifts is even: we are at D1 + months.
        // If totalShifts is odd: we are at D2 + months.
        // Wait, D1 -> D2 is +1 shift. D2 -> Next D1 is +1 shift.
        // D1 (0) -> D2 (1). D1 + 0 months.
        // D1 (0) -> Next D1 (2). D1 + 1 month.

        // So:
        // If absolute(totalShifts) % 2 !== 0, then we switch day.
        // But depends on start.
        // Start is D1.
        // 0 -> D1
        // 1 -> D2
        // 2 -> D1 (Next month)
        // 3 -> D2 (Next month)
        // -1 -> D2 (Prev month) ... wait, -1 from D1 is Prev Month D2.

        // Correct logic:
        // Month += floor(total / 2)
        // Day index = (0 + total) % 2. 
        // 0 -> D1. 1 -> D2.
        // Handle negative modulus for day index properly.
        const normalizedShift = (totalShifts % 2 + 2) % 2; // will be 0 or 1

        targetDay = normalizedShift === 0 ? d1 : d2;

        // Note: Math.floor handles negatives correctly for months (-1 / 2 = -1 (0.5)).
        // e.g. -1: floor is -1. Month -1. Remainder -1 -> norm 1 (D2). Correct (Prev Month D2).

        const start = makeDate(currentYear, targetMonthIndex, targetDay);

        // Determine End date
        // End date is "Next Period Start" - 1 day.
        // Next period is totalShifts + 1.

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
