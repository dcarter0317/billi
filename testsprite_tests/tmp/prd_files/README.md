# Billi 💸

A modern, premium bill and budget management mobile app built with **React Native**, **Expo**, **Supabase**, and **Clerk**. Billi helps you stay on top of your finances with a bank-like aesthetic, intelligent pay-period filtering, and cloud-synced data across devices.

---

## ✨ Features

### Core
- **📊 Intelligent Dashboard** — Quick overview of upcoming bills, paid totals, and next-due summaries, filtered by your personal pay period.
- **📋 Full Bill Management** — Add, edit, delete, and reorder bills via drag-and-drop. Track per-bill status (pay/paid) and cleared state.
- **🔁 Flexible Recurrence** — Support for 8 occurrence types: Every Week, Every Other Week, Twice a Week, Twice a Month, Every Month, Every Quarter, Every Year, and Installments.
- **💰 Installment Tracking** — Track multi-payment plans with total amount, per-installment amount, auto-calculated number of payments, and payment history.
- **📈 Budget Analysis** — Interactive donut pie chart with per-category progress bars and percentage breakdown.
- **📜 Transaction History** — Full ledger of all paid/cleared transactions pulled from Supabase, filterable by period, month, and category.

### Filtering & Organization
- **🔍 Global Search** — Instant search across all screens.
- **🗂️ 21 Categories** — Housing, Utilities, Food & Dining, Transportation, Entertainment, Health & Fitness, Shopping, Insurance, Personal Care, Education, Subscriptions, Investments, Debt & Loans, Credit Card, Student Loan, Gifts & Donations, Taxes, Travel, Pets, Other, Custom.
- **📅 Pay Period Filtering** — Current / Next / Previous period chips + monthly dropdown, automatically derived from your configured pay schedule (Weekly, Bi-Weekly, Monthly, Semi-Monthly).
- **⚠️ Smart Alerts** — Overdue and "Due in X days" badges on each bill card, configurable reminder window.

### Auth & Security
- **🔐 Clerk Authentication** — Email/password sign-up with email verification, plus Google and Apple OAuth.
- **🛡️ Biometric Lock** — FaceID/TouchID session lock using `expo-local-authentication`.
- **👤 User Profiles** — Name, email, and avatar stored in both Clerk and Supabase `profiles` table.
- **🗑️ Account Deletion** — Full data wipe across Supabase tables + Clerk account.

### Personalization
- **🌓 Theme Modes** — System, Light, and Dark with custom `BilliDarkTheme` / `BilliLightTheme`.
- **💵 Currency** — USD ($) and EUR (€) support across all screens.
- **🔔 Notifications** — Toggle-able notification preferences (push infrastructure ready).
- **📆 Configurable Pay Period** — Start date, occurrence (weekly/bi-weekly/monthly/semi-monthly), and semi-monthly day inputs.

---

## 🛠️ Tech Stack

| Layer          | Technology                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Framework**  | [Expo](https://expo.dev/) ~54 (React Native 0.81, React 19)                                            |
| **Routing**    | [Expo Router](https://docs.expo.dev/router/introduction/) v6 (file-based routing)                      |
| **UI**         | [React Native Paper](https://reactnativepaper.com/) (Material Design 3)                               |
| **Icons**      | [Lucide React Native](https://lucide.dev/) + Material Community Icons (via Paper)                      |
| **Charts**     | [React Native Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) (Pie) |
| **Auth**       | [Clerk](https://clerk.com/) (`@clerk/clerk-expo`) — Email, Google, Apple OAuth                         |
| **Database**   | [Supabase](https://supabase.com/) — PostgreSQL with RLS, JWT auth via Clerk                            |
| **Security**   | `expo-local-authentication` (biometrics), `expo-secure-store` (encrypted storage)                      |
| **Animations** | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) v4                      |
| **Lists**      | [React Native Draggable FlatList](https://github.com/computerjazz/react-native-draggable-flatlist)     |
| **Gradients**  | [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)                     |

---

## 📁 Project Structure

```text
billi/
├── app/                          # Expo Router app directory
│   ├── _layout.tsx               # Root layout — Clerk, providers, auth gating
│   ├── add-bill.tsx              # Add/Edit Bill modal (1022 lines)
│   ├── profile.tsx               # Profile editing modal
│   └── (tabs)/                   # Bottom tab navigator
│       ├── _layout.tsx           # Tab bar config (5 tabs)
│       ├── index.tsx             # 🏠 Home — Dashboard
│       ├── bills.tsx             # 📋 Bills — CRUD & status management
│       ├── history.tsx           # 📜 History — Transaction ledger
│       ├── budget.tsx            # 📈 Budget — Pie chart & category breakdown
│       └── settings.tsx          # ⚙️ Settings — Theme, auth, preferences
│
├── components/                   # Reusable UI components
│   ├── AuthScreen.tsx            # Sign-in/sign-up + OAuth screen
│   ├── WelcomeScreen.tsx         # First-time user name onboarding
│   ├── SecurityLock.tsx          # Biometric lock screen
│   ├── FilterBar.tsx             # Reusable filter UI (category, month, period, search)
│   ├── BillCard.tsx              # Bill card component
│   └── PayPeriodSettings.tsx     # Pay period config (used in Profile & Settings)
│
├── context/                      # React Context providers
│   ├── UserContext.tsx            # Clerk ↔ Supabase user profile sync
│   ├── UserPreferencesContext.tsx # Theme, currency, biometrics, pay period prefs
│   └── BillContext.tsx            # Bill CRUD, status toggles, Supabase sync
│
├── hooks/                        # Custom hooks
│   └── useBillFilters.ts         # Shared filter state (period, month, category, search)
│
├── services/                     # External service clients
│   ├── clerk.ts                  # Clerk config & token cache
│   └── supabase.ts               # Supabase client with Clerk JWT injection
│
├── constants/                    # Static configuration
│   ├── theme.ts                  # Dark & Light theme definitions
│   ├── categories.ts             # 21 categories + icon mapping
│   └── sharedStyles.ts           # Shared StyleSheet (filter, badge, card styles)
│
├── utils/                        # Utility functions
│   ├── date.ts                   # Date parsing, formatting, pay period intervals, bill status
│   └── currency.ts               # Currency symbol lookup
│
├── types.ts                      # Shared TypeScript interfaces (Transaction, FilterPeriod)
├── app.json                      # Expo config
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
└── babel.config.js               # Babel config (expo preset + reanimated plugin)
```

---

## 🗄️ Data Model

### Bill

| Field                   | Type                              | Description                                   |
| ----------------------- | --------------------------------- | --------------------------------------------- |
| `id`                    | `string`                          | UUID                                          |
| `title`                 | `string`                          | Bill name                                     |
| `amount`                | `string`                          | Dollar amount                                 |
| `dueDate`               | `string` (MM-DD-YYYY)             | Next due date                                 |
| `isPaid`                | `boolean`                         | Pay/Paid toggle                               |
| `isCleared`             | `boolean`                         | Payment cleared confirmation                  |
| `clearedDate`           | `string?`                         | When payment was cleared                      |
| `category`              | `string`                          | One of 21 categories or custom                |
| `order`                 | `number?`                         | Manual sort order (drag-and-drop)             |
| `occurrence`            | `string?`                         | Recurrence type (8 options)                   |
| `dueDays`               | `number[]?`                       | Specific days of week (0-6) or month (1-31)   |
| `isRecurring`           | `boolean?`                        | Whether the bill recurs                       |
| `notes`                 | `string?`                         | Free-text notes                               |
| `totalInstallments`     | `number?`                         | Total # of installment payments               |
| `paidInstallments`      | `number?`                         | # completed installment payments              |
| `totalInstallmentAmount`| `string?`                         | Total balance for installment plan            |
| `installmentStartDate`  | `string?`                         | Plan start date                               |
| `installmentEndDate`    | `string?`                         | Auto-calculated plan end date                 |
| `installmentRecurrence` | `'bi-weekly' \| 'monthly'?`      | Installment payment frequency                 |
| `remainingBalance`      | `string?`                         | Outstanding balance                           |
| `paymentHistory`        | `PaymentRecord[]?`                | Array of past payment records                 |

### Transaction

| Field              | Type                      | Description                          |
| ------------------ | ------------------------- | ------------------------------------ |
| `id`               | `string`                  | UUID                                 |
| `user_id`          | `string`                  | Clerk user ID                        |
| `bill_id`          | `string \| null`          | Associated bill ID                   |
| `title`            | `string`                  | Transaction description              |
| `amount`           | `string`                  | Dollar amount                        |
| `category`         | `string`                  | Category                             |
| `transaction_date` | `string`                  | When the transaction occurred        |
| `settlement_type`  | `'PAID' \| 'CLEARED'`    | How the transaction was settled      |
| `notes`            | `string?`                 | Optional notes                       |

### UserPreferences

| Field                      | Type                                                 | Description                 |
| -------------------------- | ---------------------------------------------------- | --------------------------- |
| `themeMode`                | `'system' \| 'light' \| 'dark'`                     | Theme preference            |
| `notificationsEnabled`     | `boolean`                                            | Push notification toggle    |
| `biometricsEnabled`        | `boolean`                                            | Biometric lock toggle       |
| `currency`                 | `string`                                             | `'USD'` or `'EUR'`         |
| `payPeriodStart`           | `number` (timestamp)                                 | Pay period start date       |
| `payPeriodOccurrence`      | `'weekly' \| 'bi-weekly' \| 'monthly' \| 'semi-monthly'` | Pay cycle type         |
| `payPeriodSemiMonthlyDays` | `[number, number]`                                   | Two days of month           |
| `upcomingReminderDays`     | `number`                                             | Alert threshold in days     |

---

## 🔒 Auth Flow

```text
App Launch
  └─▸ ClerkProvider wraps entire app
      ├─ SignedOut → AuthScreen (email/pw + Google/Apple OAuth)
      │   └─ Sign-up → email verification code → auto sign-in
      └─ SignedIn
          ├─ BiometricsEnabled? → SecurityLock → authenticate → proceed
          ├─ Name === "User"? → WelcomeScreen → set name → proceed
          └─ Main App (tabs + modals)
```

- **Supabase JWT**: Clerk session token is injected into every Supabase request via a custom fetch wrapper.
- **Token Caching**: Tokens are cached in `expo-secure-store` for offline resilience.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- npm or yarn
- [Expo Go](https://expo.dev/client) or iOS Simulator / Android Emulator

### Environment Variables
Create a `.env` file:
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Installation
```bash
git clone https://github.com/your-username/billi.git
cd billi
npm install
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR with Expo Go for physical device

---

## 🏗️ Roadmap

- [ ] **Push Notifications** — Smart reminders for upcoming due dates
- [ ] **AI-Powered Insights** — Vendor logo fetching, spending predictions
- [ ] **Export Data** — CSV / PDF export of bill history and budget reports
- [ ] **Cloud Backup** — Google Drive / iCloud backup
- [ ] **Make Payment** — In-app payment with vendor lookup and banking app integration
- [ ] **Widgets** — iOS/Android home screen widgets for at-a-glance bill summaries

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
