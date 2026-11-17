# Verify: Enhanced Bill Creation · spec 0001 · updated 2026-09-03

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / Manual

### Validation Feedback
- [x] Create a new bill. Tap Payee field and type 101 characters. Field rejects input after 100 chars with "100/100" display. → AC-1, AC-11
- [x] Leave title empty and blur field. Field shows red underline with error "Title is required". → AC-1
- [x] Enter "$12.34.56" in amount field. Field shows inline error "Max 2 decimal places" within 300ms of stopping typing. → AC-1, AC-2
- [x] Enter "-50" in amount field. Field shows inline error "Amount must be positive". → AC-1, AC-2
- [x] Enter "$75,000" in amount field. Field shows inline caution "High amount; confirm this is correct" (non-blocking, no error styling). → AC-2
- [x] Enter "$40,000" in amount field. No caution hint appears. → AC-2

### Date Validation
- [x] (Removed: AC-3 no longer restricts dates to today or later; users can select any date)

### Character Counters
- [x] Create a new bill. Type in title field; counter shows "X/100" updating live. → AC-1, AC-11
- [x] Type in notes field (multiline); counter shows "X/500" updating live. → AC-1, AC-11
- [x] Attempt to paste 600 characters of notes. Field truncates to 500 and counter shows "500/500". → AC-11

### Recurrence & Day Selection
- [x] Select "Every Month" occurrence and open day picker. Helper text says "Select 1 day". → AC-4
- [x] Select "Twice a Month" occurrence and open day picker. Helper text says "Select 2 days". → AC-4
- [x] Select "Every Week" occurrence and open day picker. Shows weekday buttons (Sun-Sat). → AC-4

### Installment Auto-Calculation
- [x] Select "Installments" occurrence. Installment section shows with "Total Installment Amount" and "Installment Amount" fields. → AC-5
- [x] Enter total amount $1200 and per-installment $100. "Total Number of Installments" auto-calculates to "12" (read-only). → AC-5
- [x] End date auto-calculates and displays read-only with lock icon. For monthly recurrence starting today, end date ≈ today + 11 months. → AC-5
- [x] Adjust paid installments count using +/- buttons. Remaining balance updates live. → AC-5

### Cross-Field Validation
- [x] Create installment bill with paid count exceeding total count. Field shows error "Paid installments cannot exceed total". → AC-6
- [x] Create installment bill where end date calculation results in end <= start. Field shows error if user attempts override. → AC-6

### Save Flow & Feedback
- [x] Fill in valid one-time bill and tap Save. Loading spinner appears on button. After success, toast "Bill added" appears for 2 seconds, then navigates back. → AC-9
- [ ] Create a one-time bill and simulate network error (if testable). Error toast "Failed to save bill" appears for 4 seconds. Form stays open for retry. → AC-10
- [ ] Trigger save and wait >10 seconds (if slow network/server). Cancel button appears next to spinner. Tap Cancel to abort submission. → AC-10
- [ ] Edit an existing recurring bill and change occurrence from "Every Month" to "Every Other Week". Dialog appears: "Changing recurrence will reschedule all future occurrences from Every Month to Every Other Week. This cannot be undone. Continue?" → AC-8
  - [ ] Tap Cancel in dialog. Occurrence reverts to original, form stays open. → AC-8
  - [ ] Tap Continue. Bill saves with new recurrence and toast "Bill updated" appears. → AC-8

### Category Selection
- [x] Open category picker. Select a preset category (e.g., "Utilities"). Category updates without error. → AC-7
- [x] Select "Custom" category. Custom category input field appears. Enter custom name (e.g., "Server Hosting"). → AC-7

## Commands

- [ ] `npm test -- utils/validation.ts` or equivalent: All unit tests for validation functions pass (test decimal validation, negative amounts, past dates, installment math, empty required fields). → AC-1, AC-2, AC-3, AC-6, AC-11

## Acceptance-criteria coverage

- AC-1 (inline validation) — covered by real-time debounced validation, error display, character counters, scroll-to-first-error on save
- AC-2 (amount field) — covered by decimal validation, negative check, caution hint, inline display
- AC-3 (date field) — covered by date picker allowing any date, no validation restrictions
- AC-4 (two-step recurrence) — covered by modal flow with occurrence type first, then day picker with helper text
- AC-5 (installment auto-calculation) — covered by auto-calculated total count and end date display
- AC-6 (cross-field validation) — covered by paid installments ≤ total, end date > start date checks
- AC-7 (category required) — covered by category picker, preset list, custom entry option
- AC-8 (recurrence edit warning) — covered by confirmation dialog on occurrence/dueDays change
- AC-9 (success feedback) — covered by success toast "Bill added/updated"
- AC-10 (save error handling) — covered by error toast, form stays open, cancel button for hung submissions
- AC-11 (character limits) — covered by title 100-char enforcement with counter, notes 500-char enforcement with counter
- AC-12 (Paper TextInput error styling) — covered by error prop on TextInput, error text display below field

## Value-sourcing verification

For each value source identified in spec's **Value sourcing** table:
- [ ] Character count for title — verify live count updates as user types; counter displays 0/100 initially, increments with input, caps at 100
- [ ] Red underline + error text — verify error prop triggers Paper TextInput's built-in red underline; error text appears below field
- [ ] 300ms debounce — verify validation does not run immediately on first keystroke; pauses 300ms after user stops; also triggers on blur
- [ ] Scroll-to-first-error on Save — verify if multiple errors exist, form scrolls to first errored field and focuses it
- [ ] Caution hint "High amount" — verify appears for amounts >= $50,000; sourced from validateAmount; non-blocking (no error styling)
- [ ] Error for negative amounts — verify parseFloat(amount) < 0 triggers error; error text shows "Amount must be positive"
- [ ] Error "Max 2 decimal places" — verify entry of "12.34.56" triggers error; error text shows inline
- [ ] (Removed: date validation no longer checks for past dates)
- [ ] Auto-calculated totalInstallments — verify Math.ceil(totalAmount / perAmount) matches displayed value; updates when either field changes
- [ ] Auto-calculated installmentEndDate — verify for monthly: startDate + (totalInstallments - 1) calendar months; for bi-weekly: startDate + (totalInstallments - 1) × 14 days; matches displayed read-only field
- [ ] Error "Paid installments cannot exceed total" — verify paidInstallments > totalInstallments triggers error inline on paid field
- [ ] Category preset list — verify CATEGORIES array from constants/categories.ts displays; user can select or enter custom
- [ ] Recurrence change dialog text — verify dialog shows old type and new type in message
- [ ] Success toast message — verify "Bill added" for new bill, "Bill updated" for edit; auto-dismisses after 2 seconds
- [ ] Error toast after save failure — verify sourced from error message in catch block; auto-dismisses after 4 seconds or on tap
- [ ] Cancel button for hung submissions — verify appears if submission time exceeds 10 seconds; tapping cancels submission and re-enables form
