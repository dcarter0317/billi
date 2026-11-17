# Utils: Date & Currency Helpers

## Overview

Utility functions for date calculations, pay period logic, and currency formatting. The date utilities handle complex pay period interval calculations, bill recurrence logic, and date formatting in MM-DD-YYYY format throughout the app.

## Key files

| File | Owns |
|---|---|
| `date.ts` | Pay period calculations, bill recurrence (8 types), interval detection, date parsing/formatting |
| `currency.ts` | Currency symbol lookup (USD/EUR), amount formatting |

## Conventions

- **Date format**: MM-DD-YYYY string for all storage and comparisons (not ISO 8601)
- **Pay period math**: start date + occurrence + (optional) semi-monthly days → next due date
- **Recurrence types**: 8 predefined occurrence strings ('Every Week', 'Bi-Weekly', etc.) match Bill.occurrence exactly
- **Duplication**: pay period logic exists in both UserPreferencesContext (config store) and date.ts (calculations); changes require updates in both
- **No timezone handling**: all dates are naive (local time); no UTC conversion

## Gotchas

- **Pay period recalc on setting change**: UserPreferencesContext holds the config, but no auto-recalc of bills when pay period is updated; existing bills keep their old due dates
- **Semi-monthly edge case**: 31st day on a 30-day month falls back to last day of month; no validation that day 2 ≥ day 1
- **Installment end date**: auto-calculated from start date + (total installments * recurrence frequency); if recurrence is bi-weekly, 24 installments = ~1 year
- **Leap years**: date math doesn't account for leap years explicitly; relies on JS Date object
- **Currency rounding**: no explicit rounding on formatted amounts; uses JS string conversion
- **Bi-weekly vs Bi-monthly confusable**: 'Twice a Month' is semi-monthly, not bi-weekly; 'Every Other Week' is the bi-weekly option

## Related specs

(None yet)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
