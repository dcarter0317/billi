# 0001. Enhanced Bill Creation

**Date**: 2026-09-03
**Status**: Accepted

## Summary

The bill creation form currently offers basic validation, generic error messages, and a complex recurrence picker that confuses users. This spec redesigns the form to include real-time inline validation, clearer error feedback, a simplified two-step recurrence flow, and better installment field organization. Users will see errors as they type (not just alerts on save), amounts over $50k get a caution hint, dates must be today or later, and installment fields auto-calculate end dates. The result is a more confident, self-explanatory form that catches mistakes early and guides users through complex bill types (recurring and installments) step by step.

## Context

Bill creation is the core user flow in the app. The current form (add-bill.tsx) has three friction points: (1) the 8 recurrence types and day pickers feel overwhelming and unclear; (2) installments require manual entry of interdependent fields (total amount, per-installment amount, count, end date) with no guidance; and (3) validation is minimal and appears only as alerts after attempted save, leaving users guessing why a bill failed to save. Users make mistakes (typo amounts like 12.34.56, past due dates that don't make sense, installment counts that don't match totals) and face generic error messages that don't help. The form also lacks affordances like character limits, decimal handling guidance, and "use today" shortcuts. This creates a sense that the app is fragile or doesn't understand the user's intent.

The scope's "Enhanced bill creation" feature is Slice 1, Order 1—the walking skeleton. Fixing validation and UX directly improves the core user journey and builds confidence in the app's reliability.

## Requirements

**User stories**:
- As a user creating a bill, I want real-time validation hints so I catch mistakes before I tap Save.
- As a user with a recurring bill, I want a clear two-step process (pick type, then pick days) so I don't get lost in 8 options and day grids.
- As a user setting up an installment plan, I want the form to auto-calculate end dates and warn me if paid installments exceed the total, so I don't create inconsistent data.
- As a user, I want helpful error messages and shortcuts (like "Use Today" for due dates) so I can recover from mistakes quickly.
- As a user entering a high amount (over $50k), I want a heads-up that this is unusual, without the form blocking me, so I know it's intentional.

**Acceptance criteria**:
- **AC-1**: Real-time inline validation. Required fields (title, amount, category, occurrence, due day(s)) highlight in red when empty. Amount field shows an inline caution hint if value exceeds $50k. Decimal validation shows inline error "Max 2 decimal places" if user enters more than 2 decimal places (e.g., "12.34.56" is rejected with error message). Field validation is debounced 300ms after user stops typing; validation also runs on blur. On Save with multiple validation errors, the form scrolls to and focuses the first errored field. Title shows live character count up to 100 max; notes show count up to 500 max.
- **AC-2**: Amount field accepts only positive numbers, two decimal places max. Amounts under $50k pass silently; amounts from $50k–$999,999 show inline caution ("High amount; confirm this is correct"). Negative numbers are rejected with an inline error.
- **AC-3**: ~~Future dates only for new bills~~ (removed per user request). Users can select any date, past or future, for the due date field. No date validation restrictions.
- **AC-4**: Recurring bills use a two-step flow. Step 1: Modal showing 9 occurrence types (One Time, Every Month, Every Week, Twice a Month, Twice a Week, Every Other Week, Every Quarter, Every Year, Installments); user picks one. Step 2: Day picker modal with helper text ("Select 1 day" for monthly, "Select 2 days" for twice-a-month, "Select day of week" for weekly, etc.).
- **AC-5**: Installment bills auto-calculate. Required fields: total amount (what the user is paying over all installments) and per-installment amount (each monthly/biweekly payment). Total count is auto-calculated as `Math.ceil(totalAmount / perAmount)` and shown read-only. End date is auto-calculated by adding calendar months (for monthly recurrence) or days (for bi-weekly recurrence) to the start date. Example: Start date Jan 1, 12 monthly installments → end date = Jan 1 + (12–1) calendar months = Dec 1. For bi-weekly: end date = start date + (count–1) × 14 days. The calculated end date is shown read-only. Paid installments counter has +/- buttons and is validated to never exceed total.
- **AC-6**: Cross-field validation. Paid installments cannot exceed total installments; error shows inline ("Paid installments cannot exceed total"). Installment end date cannot be before or equal to start date; error shows inline if violated. All validations run in real-time as user types or picks dates.
- **AC-7**: Category is required; user must pick from the preset list (defined in `constants/categories.ts`, imported as `CATEGORIES` array) or enter a custom category name. No auto-default or skip option.
- **AC-8**: Recurrence edit warning. When editing an existing recurring or installment bill and the user changes the occurrence type or due days, a confirmation dialog appears: "Changing recurrence will reschedule all future occurrences from [old type] to [new type]. This cannot be undone. Continue?" (e.g., "Changing recurrence will reschedule all future occurrences from Every Month to Every Other Week. This cannot be undone. Continue?"). User can cancel (discard change) or confirm (proceed with save).
- **AC-9**: Success feedback. After a bill is saved (add or update), a brief toast appears ("Bill added" or "Bill updated"), auto-dismisses after 2 seconds, and then the user returns to the bill list.
- **AC-10**: Save error handling. If addBill or updateBill fails (network error, Supabase error), an error toast appears ("Failed to save bill"), the form stays open, and the user can retry. Save button is disabled during submission and shows a loading state. If submission takes longer than 10 seconds, a "Cancel" button appears next to the loading spinner, allowing the user to abort the submission and retry. Error toasts auto-dismiss after 4 seconds or when the user taps a dismiss button.
- **AC-11**: Character limits. Title max 100 characters (enforced, with live count visible); notes max 500 characters (enforced, with live count visible). Empty title is rejected on save with inline error.
- **AC-12**: Paper TextInput error styling. All validation errors use Paper's built-in error state (red underline, error text below the input). No custom error components or alerts for form-level errors (only alerts for recurrence edit warning and save failures, which are structural, not input-level).

## Options considered

### Option 1: Minimal enhancement (inline errors, keep existing modals)

Add real-time validation to the existing form without changing the modal flows or field organization. Errors appear inline but the two-step recurrence modal flow remains unchanged, and installment fields stay as-is.

**Pros**:
- Smallest scope; least code to write.
- Existing modal flows are familiar to any users who've used the app.

**Cons**:
- Doesn't address the core confusion (8 recurrence types are still presented at once; installment field relationships remain unclear).
- Users still struggle with complex bill types; validation alone won't fix UX confusion.
- Installment field count and interdependencies are not simplified; users still have to infer end date logic.

### Option 2: Redesign flows + validation (two-step recurrence, clearer installments) (Chosen)

Keep the modal approach but restructure: occurrence type modal always appears first (a forced choice), then a day-picker modal conditional on type. Simplify installments by requiring only total amount and per-installment amount; auto-calculate end date and count. Add real-time inline validation, caution hints, and character counts to all fields. Result is a guided, self-explanatory form.

**Pros**:
- Addresses both validation gaps and UX confusion in recurrence and installments.
- Two-step flow is a familiar pattern (most apps do occurrence type first, then granular options).
- Installment math is no longer a user responsibility; auto-calculation builds confidence.
- Real-time validation catches mistakes early and surfaces errors where they happen (inline, not alerts).
- Caution hints (e.g., "high amount") educate without blocking.
- Overall form feels less fragile and more designed.

**Cons**:
- More code: new validation functions, modal restructuring, additional hint components.
- Slightly more complex to test (more validation rules and edge cases).

### Option 3: Consolidate flows into one screen (one-step recurrence + installments)

Replace the modals with a collapsible section showing all recurrence options and installment fields at once on the main form.

**Pros**:
- No modal friction; single scroll for all options.
- All fields visible at once.

**Cons**:
- The form becomes very crowded; 8 occurrence types + day grids + installment fields is too much visual complexity.
- Mobile readability suffers; users have to scroll a lot and lose context.
- Not aligned with Material Design 3 conventions for complex pickers.

## Decision

**Chosen option**: Option 2: Redesign flows + validation

The bill creation form will introduce real-time inline validation using Paper's TextInput error states, add caution hints for high amounts and invalid dates, and guide users through complex bill types via a two-step modal flow (occurrence type first, then granular options). Installment bills will auto-calculate end date and total count from total amount and per-installment amount, eliminating manual math. All validation runs as the user types or picks, and errors appear inline next to the field, not as alerts. A confirmation dialog will warn users before they change recurrence on an existing bill. After save, a brief toast confirms success before returning to the bill list.

**Implementation skills**: `vercel-react-native-skills` (.claude/skills/vercel-react-native-skills/) · `typescript-advanced-types` (.claude/skills/typescript-advanced-types/)

## Rationale

The top three UX pain points are recurrence confusion, installment complexity, and generic errors. Option 2 tackles all three: two-step recurrence simplifies choice logic, auto-calculated installments remove user math and guessing, and real-time inline validation provides immediate, actionable feedback. The form becomes a teacher, not a gatekeeper. Caution hints (rather than rejections) for high amounts balance user freedom with early detection of typos. The Paper TextInput error styling keeps the UI system-consistent and avoids custom component sprawl. This approach aligns with Material Design 3 conventions and the existing Expo Router + Paper stack, requiring no new external libraries. The feature is achievable in one build sprint and directly improves the core user journey (Slice 1, Order 1).

## Feature design

**Data model sketch**:

Existing Bill interface (no schema changes; validation-only enhancement):

| Field | Type | Required | Notes |
|---|---|---|---|
| title | string (max 100) | Yes | Payee name; must be non-empty |
| amount | string (decimal, 2 places) | Yes | Formatted via formatAmount; positive only |
| dueDate | string (MM-DD-YYYY) | Yes | Must be today or later for new bills |
| category | string | Yes | From CATEGORIES list or custom; max 100 chars |
| occurrence | string | Yes | One of: 'One Time', 'Every Month', 'Every Week', 'Twice a Month', 'Twice a Week', 'Every Other Week', 'Every Quarter', 'Every Year', 'Installments' |
| dueDays | number[] | Conditional | Required if occurrence is not 'One Time'; 1–31 for months, 0–6 for weekdays |
| isPaid | boolean | No | Defaults to false |
| isCleared | boolean | No | Defaults to false |
| notes | string (max 500) | No | Optional; user guidance on brevity |
| totalInstallments | number | Conditional | Required if occurrence is 'Installments'; auto-calculated from total amount / per-installment amount |
| paidInstallments | number | Conditional | Required if occurrence is 'Installments'; validated ≤ totalInstallments |
| totalInstallmentAmount | string (decimal) | Conditional | Required if occurrence is 'Installments'; total the user pays over all installments |
| installmentRecurrence | 'bi-weekly' \| 'monthly' | Conditional | Required if occurrence is 'Installments'; affects end date calculation |
| installmentStartDate | string (MM-DD-YYYY) | Conditional | Required if occurrence is 'Installments'; must be ≤ installmentEndDate |
| installmentEndDate | string (MM-DD-YYYY) | Conditional | Auto-calculated from start date + count × recurrence interval; read-only to user |

No database schema changes. All validation is client-side; backend (BillContext) remains unchanged.

**State transitions** (not applicable; form has no state machine):

Form is a simple input-to-save flow. No intermediate states or async workflows beyond the save itself.

**API surface**:

| Action | Handler | Key inputs | Key outputs / side effects | Auth | Key errors |
|---|---|---|---|---|---|
| Validate field (real-time) | `validateField(fieldName, value, context)` | fieldName, value, full form state | { isValid: bool, error?: string, hint?: string } | N/A | Returns error/hint, no throw |
| Validate form before save | `validateBillForm(billData)` | complete bill object | { isValid: bool, errors: { [fieldName]: string } } | N/A | Returns errors map |
| Save bill (add or update) | BillContext.addBill / updateBill | Bill (Omit<Bill, 'id'>) or partial Bill | optimistic update to local state, then server sync | User must be signed in (enforced by BillContext) | 422 (validation fails), 500 (server error); retry keeps form open |
| Show success toast | Toast.show | message: string | Brief snackbar appears, auto-dismisses | N/A | N/A |
| Show error toast | Toast.show | message: string | Brief snackbar appears, auto-dismisses or user taps to close | N/A | N/A |

**Value sourcing** (every value each acceptance criterion needs):

| Acceptance criterion | Value produced / displayed | Source |
|---|---|---|
| **AC-1** (inline validation) | Character count for title | Live count via title.length in component state; limit from AC-11 (100 max) |
| **AC-1** | Character count for notes | Live count via notes.length; limit from AC-11 (500 max) |
| **AC-1** | Red underline + error text for required fields | Field's `isValid` state from validateField; Paper TextInput error prop |
| **AC-1** | Validation debounce timing | 300ms debounce after user stops typing; also validates on field blur |
| **AC-1** | Scroll-to-first-error on Save | On validation failure, scroll to and focus the first errored field |
| **AC-2** | Caution hint "High amount" | Triggered if amount > 50000; sourced from validateField return |
| **AC-2** | Error for negative amounts | Triggered if parseFloat(amount) < 0; sourced from validateField |
| **AC-2** | Error "Max 2 decimal places" | Triggered if user enters > 2 decimal places; sourced from validateField; shown as inline error text |
| **AC-3** | Date field (any date allowed) | No validation; user can select any date past or future |
| **AC-4** | Occurrence type modal list | OCCURRENCES array; user picks one |
| **AC-4** | Day picker helper text | Dynamic based on occurrence; sourced from occurrence state |
| **AC-5** | Auto-calculated totalInstallments | Math: Math.ceil(parseFloat(totalInstallmentAmount) / parseFloat(amount)); computed in useEffect |
| **AC-5** | Auto-calculated installmentEndDate | For monthly recurrence: start date + (totalInstallments - 1) calendar months (e.g., Jan 1 + 11 months = Dec 1). For bi-weekly: start date + (totalInstallments - 1) × 14 days. Computed in useEffect; user cannot edit. |
| **AC-6** | Error "Paid installments cannot exceed total" | Triggered if paidInstallments > totalInstallments; sourced from validateField |
| **AC-6** | Error for installment end < start | Triggered if parseDate(installmentEndDate) <= parseDate(installmentStartDate); sourced from validateField |
| **AC-7** | Category preset list | Sourced from `constants/categories.ts` (CATEGORIES array); imported and displayed in category modal |
| **AC-8** | Recurrence change confirmation dialog | Triggered on edit if occurrence or dueDays differ from editingBill. Dialog text: "Changing recurrence will reschedule all future occurrences from [old type] to [new type]. This cannot be undone. Continue?" |
| **AC-9** | Success toast message "Bill added" or "Bill updated" | Sourced from isEdit flag and useBills context; shown after save succeeds; auto-dismisses after 2 seconds |
| **AC-10** | Error toast after save failure | Sourced from err.message in catch block of handleSave; auto-dismisses after 4 seconds or when user taps dismiss |
| **AC-10** | Cancel button for hung submissions (>10s) | Appears if submission time exceeds 10 seconds; allows user to abort and retry |
| **AC-11** | Title max 100 chars | Enforced in validateField and onChange (reject input if length > 100) |
| **AC-11** | Notes max 500 chars | Enforced in validateField and onChange |

**Key invariants**:
- A new bill's dueDate cannot be in the past.
- Amount must always be positive.
- For recurring bills (occurrence != 'One Time'), dueDays must have at least one entry.
- For installment bills: totalInstallmentAmount > 0, amount > 0, totalInstallments > 0, and totalInstallments = ceil(totalInstallmentAmount / amount).
- paidInstallments can never exceed totalInstallments.
- installmentEndDate is always >= installmentStartDate (enforced by calculation logic).
- Title must be non-empty.
- Category must be selected (from preset or custom entry).

**Security model**:

Form is auth-walled (BillProvider requires UserContext). All bill creates and updates are scoped to user.id via BillContext methods. No special role logic; single-user app. No PII concerns beyond user email in bill notes (if user enters it). No compliance scope triggered.

**Configuration required**:
- No new environment variables or credentials needed. Uses existing Supabase client and Clerk auth from BillContext.

**Critical test scenarios**:
- **Happy path: Create a one-time bill**: User enters title, amount, due date (today or later), category, and taps Save. Form validates in real-time. Save succeeds; toast appears; user returns to bill list. Bill appears with correct amount and date. Verifies **AC-1, AC-2, AC-3, AC-9**.
- **Happy path: Create a monthly recurring bill**: User picks "Every Month" in modal, then picks day 15 in day picker. Form auto-calculates due date. Save succeeds. Bill appears with occurrence = 'Every Month', dueDays = [15]. Verifies **AC-4, AC-9**.
- **Happy path: Create an installment plan**: User picks "Installments" in modal. Enters total amount $1200, per-installment amount $100, start date today. Form auto-calculates total = 12 and end date = today + 11 months. Save succeeds. Bill appears with installment count = 12. Verifies **AC-5, AC-9**.
- **Failure: Amount validation**: User enters "99.999" in amount field. Field shows inline error "Max 2 decimal places". User enters "-50" in amount; field shows inline error "Amount must be positive". User enters "75000" in amount; field shows inline caution "High amount; confirm this is correct" (no error, user can still save). Verifies **AC-2**.
- **Failure: Date validation**: User enters a due date from yesterday. Field shows inline error "Due date must be today or later". User taps "Use Today" button; date updates to today. Error clears. Verifies **AC-3**.
- **Failure: Required field**: User skips title or category. Field highlights in red. On Save attempt, form shows error without sending to server. Verifies **AC-1, AC-11**.
- **Failure: Installment inconsistency**: User enters installment plan with total $1000, per-installment $100, but then changes paid count to 15 (exceeds total 10). Field shows inline error "Paid installments cannot exceed total". Verifies **AC-6**.
- **Failure: Recurrence edit warning**: User edits an existing recurring bill and changes occurrence from "Every Month" to "Every Other Week". Dialog appears: "Changing recurrence will affect future occurrences. Continue?" User taps Cancel; form discards change and stays open. User taps Continue; change is saved and toast appears. Verifies **AC-8**.
- **Failure: Save error**: User enters valid bill and taps Save. Network fails (simulated). Error toast appears ("Failed to save bill"). Form stays open. User retaps Save; save retries and succeeds (or fails again). Verifies **AC-10**.

## Build plan

Ordered by Tracer Bullet approach: core validation logic first (foundation), then form UX enhancements (modals, helpers, feedback), then testing.

### Phase 1: Validation foundation

- **Task 1.1**: Create `utils/validation.ts` with exported validation functions: `validateTitle(title)`, `validateAmount(amount)`, `validateDueDate(dueDate, isNew)`, `validateCategory(category)`, `validateInstallments(totalAmount, perAmount, paidCount, totalCount)`, `validateRecurrence(occurrence, dueDays)`. Each returns `{ isValid: bool, error?: string, hint?: string }`. **Satisfies: AC-1, AC-2, AC-3, AC-6, AC-11**.
- **Task 1.2**: Add a master validation function `validateBillForm(bill, isNew)` that calls all field validators and returns a map of errors. Used before server submit. **Satisfies: AC-1, AC-11**.
- **Task 1.3**: Update `add-bill.tsx` to import validation functions and call `validateField` in real-time onChange handlers for amount, title, notes. Display errors inline using Paper TextInput error prop. **Satisfies: AC-1, AC-2, AC-11**.

### Phase 2: Form fields & field-level validation UI

- **Task 2.1**: Add inline character counters to title and notes fields (visible labels showing current / max). Enforce max length in onChange (reject input if length > max). **Satisfies: AC-1, AC-11**.
- **Task 2.2**: Refactor amount field to show caution hint if value >= 50000 (inline, non-blocking). Validate decimal places and reject entry if > 2 decimals. **Satisfies: AC-2**.
- **Task 2.3**: Add "Use Today" button next to date picker (for new bills). Tapping it sets dueDate to today and clears any past-date error. **Satisfies: AC-3**.
- **Task 2.4**: Refactor the due date validation: if isNew and dueDate < today, show inline error. If isEdit, allow any date (no past-date error). **Satisfies: AC-3**.

### Phase 3: Recurrence flow redesign

- **Task 3.1**: Keep occurrence type modal but rename/clarify the heading and add descriptions for each type (e.g., "Every Month: Bill repeats on the same day each month"). **Satisfies: AC-4**.
- **Task 3.2**: Update day picker modal to show context-aware helper text ("Select 1 day for monthly", "Select 2 days for twice-a-month", "Select day of week for weekly"). **Satisfies: AC-4**.

### Phase 4: Installment UX clarity

- **Task 4.1**: Restructure installment section: user enters total amount + per-installment amount (both required). Remove manual totalInstallments entry. Add auto-calculation: compute totalInstallments = ceil(totalAmount / perAmount) and display read-only. **Satisfies: AC-5**.
- **Task 4.2**: Auto-calculate and display installmentEndDate read-only based on start date + count × recurrence interval. Show in a locked TextInput with calendar-lock icon. **Satisfies: AC-5**.
- **Task 4.3**: Add real-time cross-field validation for installment fields: if paidInstallments > totalInstallments, show inline error on the paid field. If end date <= start date, show inline error on end date field. **Satisfies: AC-6**.

### Phase 5: Save flow & error handling

- **Task 5.1**: Update `handleSave` to call `validateBillForm` before submitting. If validation fails, show inline errors and return (don't call context). **Satisfies: AC-1, AC-11**.
- **Task 5.2**: Disable Save button during submission; show loading state with spinner. If submission takes longer than 10 seconds, show a "Cancel" button next to the spinner to allow user to abort and retry. If save fails, keep form open and show error toast (auto-dismisses after 4s). User can retry. **Satisfies: AC-10**.
- **Task 5.3**: Add recurrence edit warning: on edit, if occurrence or dueDays differ from editingBill, show a confirmation dialog. User can cancel (discard change) or confirm (proceed with save). **Satisfies: AC-8**.
- **Task 5.4**: Add success toast after save: "Bill added" (if new) or "Bill updated" (if edit). Auto-dismiss after 2 seconds, then navigate back to bill list. **Satisfies: AC-9**.

### Phase 6: Testing & refinement

- **Task 6.1**: Unit tests for validation functions in `utils/validation.ts`: test edge cases (empty strings, negative amounts, past dates, decimal overflow, installment inconsistency). **Satisfies: AC-1, AC-2, AC-3, AC-6, AC-11**.
- **Task 6.2**: Integration tests for form: add bill with valid inputs (happy path, recurring, installments); edit bill and trigger recurrence warning; save error and retry. **Satisfies: AC-4, AC-5, AC-8, AC-9, AC-10**.
- **Task 6.3**: Manual QA on iOS and Android: test form across devices; verify Paper TextInput error styling; confirm toast timing and navigation.

## Consequences

**Positive**:
- Users will catch mistakes early (in-form, not via alerts after failed save), reducing frustration and retries.
- Real-time validation teaches users what's valid (e.g., "Max 2 decimals" appears as they type, not as an alert).
- Two-step recurrence and auto-calculated installments remove confusion and mental burden; users feel guided, not lost.
- Caution hints (e.g., high amounts) are non-blocking; power users aren't bottlenecked, but typos are flagged.
- Brief toast feedback (not an alert) keeps the UX smooth and modern.
- Using Paper TextInput error styling keeps the design system consistent; no custom components.

**Tradeoffs**:
- More code in validation logic and form state management; tests need to cover more edge cases.
- Modal flow adds a step (pick type, then pick days) before the day picker appears; for power users who know the type, this is an extra tap.
- Recurrence edit warning adds a confirmation dialog; users editing recurring bills see a prompt, which may feel cautious but is protective.

**Downstream**:
- `/develop` will implement these tasks in order; no code changes to BillContext or data model.
- `/check verify` will verify that each AC is met: test the validation rules, UX flows, error messages, and save behavior on real devices.
- Future bill editing and deletion features (Slice 1, Orders 2–3) can reuse the validation functions from this spec.
- If later features (e.g., bill templates, bulk operations) touch bill creation, they can call the same validation functions to maintain consistency.

## Follow-up

- Consider a future enhancement to "smart category detection" (infer category from payee name; e.g., "PG&E" → "Utilities") to speed up data entry.
- Monitor user feedback on the two-step recurrence flow; if users find it cumbersome, consider a one-screen collapse-able alternative.
- After `/check verify`, run a usability test with a few users to confirm the form reduces confusion for recurring and installment bills.

## Rationale

*This section is intentionally brief for a feature spec. Full reasoning lives in the decision record above (Context, Options considered, Decision, Rationale).*

Inline validation catches errors where they occur and when the user can act on them, not via generic alerts after submission. The two-step recurrence flow simplifies a complex choice (8 types × N days) into a sequence that feels guided, not overwhelming. Auto-calculating installments removes the risk of user math errors and clarifies the relationship between total cost and per-payment amount. Using Paper's built-in error styling avoids custom UI sprawl and maintains design consistency. This approach is achievable in one sprint and directly improves the core user journey (Slice 1, Order 1), enabling confidence in the app's UX and reliability.
