# Billi Scope

**Product:** Personal finance app for bill management, budgeting, and expense tracking across mobile and web.

**Build approach:** Tracer Bullet (complete real features end to end, then thicken each segment).

**Workflow:** Alpha (after `/develop`, run `/check verify`; no separate test suite or review by default).

## At a Glance

| Order | Feature | Phase | Status |
|-------|---------|-------|--------|
| — | Authentication (Clerk) | Foundation | existing |
| — | Database & API (Supabase) | Foundation | existing |
| — | Core UI framework & theming | Foundation | existing |
| — | Design system (React Native Paper) | Foundation | existing |
| 1 | Enhanced bill creation & validation | Slice 1 | in-progress |
| 2 | Edit and delete bills | Slice 1 | planned |
| 3 | Bill status management | Slice 1 | planned |
| 4 | Pay period recurrence clarity | Slice 1 | planned |
| 5 | Bill reminders & notifications | Slice 2 | planned |
| 6 | Data export & backup | Slice 3 | planned |
| 7 | Performance & offline support | Cross-cutting | planned |
| 8 | Accessibility (WCAG) improvements | Cross-cutting | planned |

## Foundation

Already built and stable. Auth via Clerk, database via Supabase, Expo + React Native Paper for UI.

## Slice 1: Enhanced Bill Management

**Intent:** Improve the core bill creation and management workflow. Provide clearer forms, better error feedback, make editing and deleting bills seamless, and simplify pay period configuration so users understand recurrence options easily.

**Done when:** User can create a bill with clear form validation and helpful error messages; edit an existing bill; delete a bill with confirmation; understand and configure their pay period type (weekly, biweekly, semi-monthly, monthly, etc.) without confusion; see bill status (pending, paid, overdue) clearly in the UI.

- [x] Design: `/architect` Enhanced bill creation [0001](../specs/0001-enhanced-bill-creation.md)
- [x] Build it: `/develop` Enhanced bill creation
  - [x] Validation foundation (utils/validation.ts, form-level validation, test edge cases) — AC-1, AC-2, AC-6, AC-11
  - [x] Form fields & feedback (character counters, caution hints, inline errors) — AC-1, AC-2
  - [x] Recurrence flow clarity (improved modals, helper text) — AC-4
  - [x] Installment UX (auto-calculation, cross-field validation) — AC-5, AC-6
  - [x] Save flow & error handling (form validation before submit, loading states, retry logic, confirmation dialogs) — AC-8, AC-9, AC-10
- [x] Verify it: `/check verify` bill creation works and feels smooth
- [ ] Test it: `/test` Enhanced bill creation
- [ ] `/architect` Bill editing and deletion (safety, confirmation flows)
- [ ] `/develop` Bill editing and deletion
- [ ] `/check verify` edit and delete flows
- [ ] `/architect` Bill status management (paid/pending/overdue states, UI indicators)
- [ ] `/develop` Bill status management
- [ ] `/check verify` status tracking is reliable
- [ ] `/architect` Pay period recurrence UI (simplify 8-occurrence type picker, add guidance)
- [ ] `/develop` Pay period recurrence clarity
- [ ] `/check verify` users can configure pay period without confusion

## Slice 2: Notifications & Reminders

**Intent:** Proactively notify users of upcoming bills and due dates. Let them set reminders, receive push notifications, and mark bills complete from notifications. This creates accountability and reduces missed payments.

**Done when:** User can enable bill reminders and choose how far in advance to be notified (e.g., 3 days before); receive push notifications at the configured time; tap notification to mark bill as paid; reminder settings persist in user preferences.

- [ ] `/architect` Bill reminders & push notifications (notification service, scheduling, user preferences)
- [ ] `/develop` Bill reminders feature
- [ ] `/check verify` reminders trigger at correct times and land on device
- [ ] `/develop` Mark bills paid from notification
- [ ] `/check verify` notification workflow closes the loop

## Slice 3: Data Management

**Intent:** Give users control over their data. Allow exporting bills and history, backing up preferences, and resetting the app if needed. Builds trust and provides escape hatch if they switch tools.

**Done when:** User can export all their bills as CSV or JSON; export/restore app settings and preferences; clear app cache; optional data reset; exports land as files they can save or share.

- [ ] `/architect` Data export (format, scope, file handling)
- [ ] `/develop` Export bills and history
- [ ] `/check verify` exports are complete and parseable
- [ ] `/develop` Export and restore preferences
- [ ] `/check verify` restore works correctly

## Cross-Cutting: Performance & Offline Support

**Intent:** Make the app responsive and functional even with poor connectivity. Cache bills locally, sync intelligently, keep the UI responsive during data operations.

**Done when:** App loads bills instantly from cache; sync happens in background without blocking UI; user can view cached bills offline; new bills drafted offline sync automatically when connectivity returns; no janky pauses or stalls.

Woven through Slices 1, 2, 3 during `/develop`:
- [ ] Local caching of bills and user data
- [ ] Background sync without UI blocking
- [ ] Offline read of cached data
- [ ] Graceful queue of offline-created bills

## Cross-Cutting: Accessibility (WCAG)

**Intent:** Make the app usable for everyone, including users with disabilities. Support screen readers, ensure proper contrast, allow keyboard navigation, support text sizing.

**Done when:** Screen reader reads all bill info correctly; buttons and inputs reachable via keyboard; text has sufficient color contrast (WCAG AA); pinch-to-zoom and system text size settings work; form labels and error messages are clear and associated with inputs.

Woven through Slices 1, 2, 3 during `/develop`:
- [ ] Screen reader testing and fixes
- [ ] Keyboard navigation through forms and lists
- [ ] Color contrast audit (WCAG AA minimum)
- [ ] Text sizing and zoom support
- [ ] Form accessibility (labels, error association)

---

## How to Use This Scope

1. **Slice 1** (Enhanced Bill Management) is the walking skeleton for this iteration. It touches the core loop end to end: create → view → edit → manage status. Ship it first.
2. **Slice 2** (Notifications) adds a new dimension to the loop: awareness and follow up.
3. **Slice 3** (Data Management) adds user control and portability.
4. **Cross-cutting** (Performance, Accessibility) are woven into each slice as they're built, not saved for the end.

Start with the first unticked box and work top to bottom. Use `/architect` when a feature needs a spec (design, data model, behavior decision); use `/develop` to build it; use `/check verify` to confirm it works.
