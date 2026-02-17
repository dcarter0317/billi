# Billi — Product Requirements Document (PRD)

**Version**: 1.0  
**Date**: February 16, 2026  
**Status**: Active Development  

---

## 1. Product Overview

### 1.1 Vision
Billi is a premium personal finance management mobile app that gives users complete control over their bills, payments, and budget. It delivers a bank-grade, polished experience that makes bill tracking effortless and enjoyable.

### 1.2 Problem Statement
Managing bills across multiple services is fragmented and error-prone. Users forget due dates, lose track of paid vs. unpaid status, and have no clear picture of their spending by category or pay period. Existing apps are either too complex (full budgeting suites) or too simplistic (bare checklists).

### 1.3 Target Audience
- Individuals managing personal bills and subscriptions
- Users who get paid on a regular schedule (weekly, bi-weekly, monthly, semi-monthly) and want to see which bills fall within each pay cycle
- People who want a visually premium, easy-to-use mobile finance tool

### 1.4 Key Value Propositions
1. **Pay-period-aware** — See exactly which bills are due during your current, next, or previous pay cycle
2. **One-tap status tracking** — Toggle pay/paid with a switch, confirm cleared with a checkbox
3. **Premium experience** — Bank-like dark/light theme, smooth animations, drag-and-drop reordering
4. **Cloud-synced** — Data persists across devices via Supabase with Clerk authentication

---

## 2. User Personas

### 2.1 Sarah — Bi-Weekly Worker
- Gets paid every two weeks
- Has ~15 recurring bills (rent, utilities, subscriptions, car payment)
- Wants to see which bills are due this paycheck vs. next paycheck
- Values quick toggles and visual clarity

### 2.2 Marcus — Freelancer
- Income arrives at irregular intervals
- Tracks installment plans (BNPL purchases)
- Needs a flexible system that handles one-time, recurring, and installment bills
- Uses custom categories for client-related expenses

---

## 3. Functional Requirements

### 3.1 Authentication & Onboarding

| ID     | Requirement                                                               | Status   |
| ------ | ------------------------------------------------------------------------- | -------- |
| AUTH-1 | Email/password sign-up with email verification code                       | ✅ Done  |
| AUTH-2 | Email/password sign-in                                                    | ✅ Done  |
| AUTH-3 | Google OAuth sign-in                                                      | ✅ Done  |
| AUTH-4 | Apple OAuth sign-in with real name/email resolution                       | ✅ Done  |
| AUTH-5 | First-time onboarding — ask user for display name via WelcomeScreen       | ✅ Done  |
| AUTH-6 | Sign-out with confirmation dialog                                         | ✅ Done  |
| AUTH-7 | Account deletion (wipes Supabase + Clerk data)                            | ✅ Done  |
| AUTH-8 | Password reset flow                                                       | 🔲 TODO |

### 3.2 Security

| ID     | Requirement                                                               | Status   |
| ------ | ------------------------------------------------------------------------- | -------- |
| SEC-1  | Biometric lock (FaceID/TouchID/Android) on app launch                     | ✅ Done  |
| SEC-2  | SecurityLock screen with branded UI and unlock button                     | ✅ Done  |
| SEC-3  | Token caching in encrypted SecureStore                                    | ✅ Done  |
| SEC-4  | Row Level Security (RLS) on Supabase — users access only own data        | ✅ Done  |
| SEC-5  | Clerk JWT injected into every Supabase request                            | ✅ Done  |

### 3.3 Home Screen (Dashboard)

| ID     | Requirement                                                               | Status   |
| ------ | ------------------------------------------------------------------------- | -------- |
| HOME-1 | Display user greeting with name and avatar                                | ✅ Done  |
| HOME-2 | Show total balance for the current filtered period                        | ✅ Done  |
| HOME-3 | List upcoming (unpaid) bills with title, amount, due date, category       | ✅ Done  |
| HOME-4 | Filter by pay period (this/next/previous), month, or category             | ✅ Done  |
| HOME-5 | Search bar to filter bills by title                                       | ✅ Done  |
| HOME-6 | Overdue/upcoming alert badges on each card                                | ✅ Done  |
| HOME-7 | Navigate to Profile from avatar tap                                       | ✅ Done  |
| HOME-8 | Show recently settled (paid/cleared) bills in a separate section          | ✅ Done  |

### 3.4 Bills Screen

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| BILL-1  | List all bills with full card UI (avatar, title, due date, amount)       | ✅ Done  |
| BILL-2  | Pay/Paid toggle switch per bill                                          | ✅ Done  |
| BILL-3  | "Payment Cleared" checkbox per bill                                      | ✅ Done  |
| BILL-4  | Drag-and-drop reordering via long-press                                  | ✅ Done  |
| BILL-5  | Edit button → opens add-bill modal in edit mode                          | ✅ Done  |
| BILL-6  | Delete button with confirmation dialog                                   | ✅ Done  |
| BILL-7  | "Reset All Statuses" button — marks all as unpaid/uncleared              | ✅ Done  |
| BILL-8  | Paid Total summary card                                                  | ✅ Done  |
| BILL-9  | Filter by pay period, month, category, search                            | ✅ Done  |
| BILL-10 | FAB "Add Bill" button                                                    | ✅ Done  |
| BILL-11 | Recurring badge indicator                                                | ✅ Done  |
| BILL-12 | Installment progress display (X of Y payments made)                      | ✅ Done  |
| BILL-13 | Notes display (truncated, italic)                                        | ✅ Done  |

### 3.5 Add/Edit Bill

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| ADD-1   | Title field                                                              | ✅ Done  |
| ADD-2   | Amount field (numeric)                                                   | ✅ Done  |
| ADD-3   | Due date picker                                                          | ✅ Done  |
| ADD-4   | Category dropdown (21 categories + custom)                               | ✅ Done  |
| ADD-5   | Occurrence picker (8 types)                                              | ✅ Done  |
| ADD-6   | Day picker for recurring bills (weekdays or days-of-month)               | ✅ Done  |
| ADD-7   | Auto-calculate next due date from selected days                          | ✅ Done  |
| ADD-8   | Installment fields: total amount, per-payment, count, start date, recurrence | ✅ Done  |
| ADD-9   | Auto-calculate installment count (total ÷ per-payment)                   | ✅ Done  |
| ADD-10  | Auto-calculate installment end date                                      | ✅ Done  |
| ADD-11  | Notes field                                                              | ✅ Done  |
| ADD-12  | Paid/Cleared toggles                                                     | ✅ Done  |
| ADD-13  | Edit mode — pre-populate all fields from existing bill                   | ✅ Done  |
| ADD-14  | Payment history display (for installments in edit mode)                  | ✅ Done  |
| ADD-15  | Delete individual payment records                                        | ✅ Done  |

### 3.6 History Screen

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| HIST-1  | List all transactions from Supabase `transactions` table                 | ✅ Done  |
| HIST-2  | Show title, amount, category badge, settlement type, date                | ✅ Done  |
| HIST-3  | Filter by pay period, month, category, search                            | ✅ Done  |
| HIST-4  | Empty state with descriptive message                                     | ✅ Done  |
| HIST-5  | Total summary for filtered results                                       | ✅ Done  |

### 3.7 Budget Screen

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| BUD-1   | Donut pie chart showing spend by category                                | ✅ Done  |
| BUD-2   | Grand total displayed in chart center                                    | ✅ Done  |
| BUD-3   | Category list with per-category amount and percentage bar                | ✅ Done  |
| BUD-4   | Sorted by highest spend first                                            | ✅ Done  |
| BUD-5   | Budget targets / spending limits per category                            | 🔲 TODO |

### 3.8 Settings Screen

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| SET-1   | User profile summary (name, email, avatar) with link to edit             | ✅ Done  |
| SET-2   | Theme selector (System / Light / Dark)                                   | ✅ Done  |
| SET-3   | Notifications toggle                                                     | ✅ Done  |
| SET-4   | Biometric unlock toggle                                                  | ✅ Done  |
| SET-5   | Currency selector (USD / EUR)                                            | ✅ Done  |
| SET-6   | Pay period configuration (start, occurrence, semi-monthly days)          | ✅ Done  |
| SET-7   | Upcoming reminder days configuration                                     | ✅ Done  |
| SET-8   | Log out with confirmation                                                | ✅ Done  |
| SET-9   | Delete account with confirmation                                         | ✅ Done  |
| SET-10  | App version info                                                         | ✅ Done  |

### 3.9 Profile Screen

| ID      | Requirement                                                              | Status   |
| ------- | ------------------------------------------------------------------------ | -------- |
| PRO-1   | Edit display name                                                        | ✅ Done  |
| PRO-2   | Edit email                                                               | ✅ Done  |
| PRO-3   | Edit avatar (image picker)                                               | ✅ Done  |
| PRO-4   | Pay period settings (embedded component)                                 | ✅ Done  |
| PRO-5   | Delete account                                                           | ✅ Done  |

---

## 4. Non-Functional Requirements

| Category       | Requirement                                                               |
| -------------- | ------------------------------------------------------------------------- |
| **Platform**   | iOS and Android via React Native / Expo                                   |
| **Performance**| Screens render in < 500ms; list scrolling at 60fps via Reanimated         |
| **Security**   | All API calls authenticated; RLS enforced; tokens in encrypted storage    |
| **Offline**    | Bills cached locally (AsyncStorage); preferences in SecureStore           |
| **Theme**      | System-aware dark/light mode with persistent user override                |
| **Accessibility** | Standard React Native accessibility props; touch targets ≥ 44pt       |

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│                    Expo App                       │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Expo Router  │  │  Paper   │  │ Reanimated │  │
│  │  (Routing)   │  │   (UI)   │  │ (Animate)  │  │
│  └──────┬──────┘  └────┬─────┘  └──────┬─────┘  │
│         │              │               │         │
│  ┌──────▼──────────────▼───────────────▼──────┐  │
│  │            React Context Layer             │  │
│  │  UserContext │ PreferencesContext │ BillCtx │  │
│  └──────────────────┬─────────────────────────┘  │
│                     │                            │
│  ┌──────────────────▼─────────────────────────┐  │
│  │            Services Layer                  │  │
│  │    Clerk (Auth)  ←→  Supabase (DB + RLS)   │  │
│  │         JWT injection via custom fetch      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │          Local Storage                     │  │
│  │   SecureStore (prefs/tokens)               │  │
│  │   AsyncStorage (bill cache)                │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 5.2 Database Tables (Supabase)

| Table          | Description                                    | RLS |
| -------------- | ---------------------------------------------- | --- |
| `profiles`     | User profiles (id, email, full_name, avatar)   | ✅  |
| `bills`        | All bill records with 20+ columns              | ✅  |
| `transactions` | Payment/cleared history records                | ✅  |

### 5.3 Context Providers

| Provider                  | Responsibilities                                          |
| ------------------------- | --------------------------------------------------------- |
| `UserProvider`            | Clerk ↔ Supabase profile sync, `updateUser`, `deleteAccount` |
| `UserPreferencesProvider` | Theme, currency, biometrics, pay period, persistence      |
| `BillProvider`            | Bill CRUD, status toggles, Supabase sync, transaction recording |

---

## 6. Occurrence Types

| Type               | Behavior                                          |
| ------------------ | ------------------------------------------------- |
| Every Week         | Advances 7 days on paid                           |
| Every Other Week   | Advances 14 days on paid                          |
| Twice a Week       | Advances 3 days on paid; supports multi-day       |
| Twice a Month      | Advances 15 days on paid                          |
| Every Month        | Advances 1 month on paid; supports day-of-month   |
| Every Quarter      | Advances 3 months on paid                         |
| Every Year         | Advances 1 year on paid                           |
| Installments       | Tracks X of Y payments; bi-weekly or monthly      |
| One Time           | No recurrence                                     |

---

## 7. Future Roadmap

### Phase 2 — Engagement
| Feature                 | Priority | Description                                           |
| ----------------------- | -------- | ----------------------------------------------------- |
| Push Notifications      | High     | Smart reminders for upcoming/overdue bills            |
| Budget Targets          | High     | Set spending limits per category with alerts          |
| Make Payment            | Medium   | In-app payment links with vendor lookup               |
| Data Export             | Medium   | CSV / PDF export of history and budget reports        |

### Phase 3 — Intelligence
| Feature                 | Priority | Description                                           |
| ----------------------- | -------- | ----------------------------------------------------- |
| AI Vendor Lookup        | Medium   | Auto-detect vendor logos and payment URLs              |
| Spending Predictions    | Medium   | Forecast monthly spend based on bill patterns          |
| Home Screen Widgets     | Low      | iOS/Android widgets for at-a-glance summaries         |
| Cloud Backup            | Low      | Google Drive / iCloud automatic backup                |
| Multi-Currency          | Low      | Support for additional currencies beyond USD/EUR       |

---

## 8. Success Metrics

| Metric                     | Target              |
| -------------------------- | -------------------- |
| Onboarding completion      | > 90%               |
| Daily active usage         | User opens app 1x/day |
| Bills tracked per user     | 10+ after 1 month   |
| Crash-free rate            | > 99.5%             |
| App Store rating           | ≥ 4.5 stars         |

---

*Document generated from codebase analysis — February 16, 2026*
