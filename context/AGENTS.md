# Context: State Management & Data Syncing

## Overview

This area manages the app's global state via React Context providers and handles synchronization between Clerk authentication and Supabase database. It includes user profile management, bill CRUD operations, user preferences, and real-time data updates.

## Key files

| File | Owns |
|---|---|
| `UserContext.tsx` | Clerk ↔ Supabase user profile sync, account deletion, sign-out |
| `BillContext.tsx` | Bill CRUD, status toggles (paid/cleared), recurrence calculations, transaction recording |
| `UserPreferencesContext.tsx` | Theme, currency, biometrics, pay period config, async persistence |

## Conventions

- **Provider pattern**: each context exports a Provider component and a custom hook (useUser, useBills, usePreferences)
- **Supabase JWT injection**: UserContext sets the token provider once on session init; all Supabase queries inherit the Clerk JWT
- **Async storage for preferences**: UserPreferencesContext persists to AsyncStorage; changes don't auto-save (manual save on context update)
- **TypeScript strict types**: interface definitions for DB rows (DbBill, SupabaseProfile) separate from frontend types
- **Error handling**: context methods throw; callers handle catch
- **Bill amounts stored as strings**: amounts are numeric strings in Supabase (not JS numbers) to avoid floating point issues
- **Transaction recording**: every pay/clear action triggers a transaction insert; deletion is separate

## Gotchas

- **User profile priority chain**: Supabase takes priority over Clerk for name/email/avatar; a gap in Supabase (new sign-up before first sync) falls back to Clerk values then email local part
- **Pay period logic is spread**: UserPreferencesContext stores config, but interval calculations live in `utils/date.ts`; changes to recurrence rules require updates in both
- **Bill deletion is silent**: no transaction is recorded when a bill is deleted; only paid/cleared actions create transactions
- **Token provider timing**: JWT token is set in an effect after session exists; early Supabase calls before this effect runs will fail
- **Upsert on profile update**: updateUser calls upsert (not insert), so new Supabase profiles are created on first update if they don't exist
- **Account deletion order**: transactions are deleted first (FK dependency), then bills, then profile; all in one try-catch

## Related specs

(None yet)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
