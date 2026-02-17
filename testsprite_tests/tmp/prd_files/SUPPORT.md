# 🛠️ Support & Help

Welcome to the Billi Support guide! This document covers common issues and how to resolve them.

---

## 🔐 Authentication

### Can't Sign In
- **Existing account required**: You must sign up first. The sign-up flow sends a verification code to your email — enter the code to complete registration.
- **OAuth (Google / Apple)**: If using Google or Apple sign-in, ensure you have a stable internet connection. Apple Sign-In uses relay emails by default; Billi attempts to resolve your actual name and email.
- **Password reset**: Currently not implemented in-app. Please create a new account if you've lost your password.

### Session Issues
- If you're signed in but see a blank screen, force-quit and restart the app. The Clerk session token may need to refresh.

---

## 🛡️ Security & Privacy

### Biometric Lock
- **Enable/Disable**: Go to **Settings → Biometric Unlock** or **Profile → Biometric Unlock** and toggle the switch. You'll be prompted to authenticate to confirm the change.
- **Device Support**: Requires FaceID, TouchID, or Android Biometrics enabled in your system settings. Billi uses `expo-local-authentication`.
- **Fallback**: If biometrics fail repeatedly, the system will request your device passcode.

### Data Storage
- **Cloud (Supabase)**: Bills, transactions, and user profiles are stored in a PostgreSQL database via Supabase with Row Level Security (RLS). Each user can only access their own data.
- **Local (SecureStore)**: User preferences (theme, currency, pay period, biometric settings) are encrypted locally using `expo-secure-store`.
- **Auth Tokens**: Clerk session tokens are securely cached in `expo-secure-store`.

### Account Deletion
To permanently delete your account and all associated data:
1. Go to **Settings** → scroll to the bottom → **Delete Account**.
2. Confirm the deletion. This will:
   - Delete all transactions, bills, and your profile from Supabase.
   - Delete your Clerk account.
   - This action is **irreversible**.

---

## 📊 Troubleshooting

### App Stuck on Lock Screen
1. Ensure biometrics are enabled in your device's system settings.
2. Tap **Unlock App** to re-trigger the biometric prompt.
3. If issues persist, force-quit and restart the app.

### Bills Not Showing on Home Screen
- The Home screen filters bills to show only **unpaid** bills due within your current pay period.
- Check that your **pay period settings** (Settings → Pay Period) are configured correctly.
- Bills marked as **Paid** won't appear on the Home "Up Next" section.

### Budget Analysis Shows Incorrect Totals
- The Budget screen calculates totals from **all** bills, regardless of pay period or status.
- Ensure each bill has a valid **Amount** (numeric value) and assigned **Category**.

### Transactions Not Appearing in History
- Transactions are recorded when you toggle a bill to **Paid** or mark it as **Cleared**.
- They are synced to Supabase, so an internet connection is required for them to appear in History.

### Recurring Bill Dates Look Wrong
- Recurring bills auto-advance their due date when toggled to **Paid** based on the occurrence type.
- For monthly bills with specific due days, the day-of-month picker determines the next date.
- If a selected day exceeds a month's length (e.g., 31st in February), the date falls back to the last day of the month.

### Drag-and-Drop Not Working
- Drag-and-drop only works when:
  - Filter is set to **"All Bills"** (not a specific period or month).
  - Search bar is empty.
- Long-press on a bill card to initiate the drag.

---

## 📆 Pay Period Configuration

Billi supports four pay schedule types:

| Type           | Description                                |
| -------------- | ------------------------------------------ |
| **Weekly**     | Every 7 days from your start date          |
| **Bi-Weekly**  | Every 14 days from your start date         |
| **Monthly**    | Calendar month                             |
| **Semi-Monthly** | Two specific days each month (e.g., 1st & 15th) |

Configure via **Profile → Pay Period Settings** or **Settings → Pay Period**.

---

## 💵 Supported Currencies

| Currency | Symbol |
| -------- | ------ |
| USD      | $      |
| EUR      | €      |

Change in **Settings → Currency**.

---

## 📞 Get in Touch

- **GitHub Issues**: Report bugs via the GitHub repository issues page.
- **Feature Requests**: We'd love to hear how we can make Billi better!

---

*Billi — Simplify your finances.*
