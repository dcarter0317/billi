
// Mocking the logic from utils/date.ts to verify it works as expected without React dependencies

const parseDate = (date) => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getPayPeriodInterval = (
    startAnchor,
    frequency,
    offset = 0,
    semiMonthlyDays = [15, 30]
) => {
    const anchorDate = parseDate(startAnchor);
    const now = new Date(); // Will be mocked below
    now.setHours(0, 0, 0, 0);

    if (frequency === 'semi-monthly') {
        const days = [...semiMonthlyDays].sort((a, b) => a - b);
        const [d1, d2] = days; // e.g., 15, 30

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const makeDate = (year, month, day) => {
            const d = new Date(year, month, day);
            const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
            if (day > lastDayOfTargetMonth) {
                d.setDate(lastDayOfTargetMonth);
            }
            return d;
        };

        // Determine reference point: First pay day of current month (d1)
        // Check where 'now' is relative to d1 and d2
        const currentDay = now.getDate();
        let currentShift = 0;

        // Logic from date.ts
        if (currentDay < d1) currentShift = -1;      // Before 1st payday -> Prev Month 2nd payday was start
        else if (currentDay >= d2) currentShift = 1; // After 2nd payday -> This Month 2nd payday was start
        // else 0 (Between d1 and d2) -> This Month 1st payday was start

        const totalShifts = currentShift + offset;

        const addedMonths = Math.floor(totalShifts / 2);
        // Normalized shift logic from date.ts logic:
        // (totalShifts % 2 + 2) % 2; 
        const normalizedShift = (totalShifts % 2 + 2) % 2;

        let targetMonthIndex = currentMonth + addedMonths;
        let targetDay = normalizedShift === 0 ? d1 : d2;

        const start = makeDate(currentYear, targetMonthIndex, targetDay);

        // End date calculation
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
    return null;
};

// --- TEST RUNNER ---

const runTest = () => {
    const today = new Date();
    console.log(`Test Run Date: ${today.toDateString()}`);
    console.log('--- Semi-Monthly Logic Verification ---');
    console.log('Scenario: User selects 15th and 30th.');

    // Test 1: "This Period"
    const thisPeriod = getPayPeriodInterval(new Date(), 'semi-monthly', 0, [15, 30]);
    console.log(`\n"This" Pay Period (Offset 0):`);
    console.log(`Start: ${thisPeriod.start.toDateString()}`);
    console.log(`End:   ${thisPeriod.end.toDateString()}`);

    // Test 2: "Next Period"
    const nextPeriod = getPayPeriodInterval(new Date(), 'semi-monthly', 1, [15, 30]);
    console.log(`\n"Next" Pay Period (Offset 1):`);
    console.log(`Start: ${nextPeriod.start.toDateString()}`);
    console.log(`End:   ${nextPeriod.end.toDateString()}`);

    // Validation
    const currentDay = today.getDate();
    const d1 = 15;
    const d2 = 30;

    console.log('\n--- Analysis ---');
    if (currentDay < 15) {
        console.log("Current date is before the 15th.");
        console.log("Expected 'This Period' Start: Last month 30th (approx).");
        console.log("Expected 'Next Period' Start: This month 15th.");
    } else if (currentDay >= 30) {
        console.log("Current date is after the 30th.");
        console.log("Expected 'This Period' Start: This month 30th.");
        console.log("Expected 'Next Period' Start: Next month 15th.");
    } else {
        console.log("Current date is between 15th and 30th.");
        console.log("Expected 'This Period' Start: This month 15th.");
        console.log("Expected 'Next Period' Start: This month 30th.");
    }
};

runTest();
