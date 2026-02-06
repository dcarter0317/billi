# Billi 💸

A modern, minimalist bill and budget management mobile application built with **React Native** and **Expo**. Billi helps you stay on top of your finances with a premium, bank-like aesthetic and intelligent pay-period task generation.

## ✨ Features

- **📊 Intelligent Dashboard**: Get a quick overview of your total balance and upcoming bills with a refined premium card design.
- **🛡️ Biometric Security**: Protect your financial data with FaceID/TouchID and a custom session-based security lock screen.
- **📈 Dynamic Budget Analysis**: Real-time spending breakdown with interactive pie charts and category-wise progress tracking.
- **🗓️ Pay Period Task Generator**: Automatically filters and highlights bills due within your current 14-day pay cycle.
- **🔄 Drag-and-Drop Reordering**: Manually organize your bills with a smooth, interactive long-press gesture.
- **🔍 Robust Search**: Instantly find specific bills with a performant, stable search interface.
- **💰 Paid Totals**: Track your progress in real-time with dynamic "Paid Total" summaries.
- **🌓 Advanced Theming**: Dynamic dark/light mode switching with persistent user preferences.
- **💵 Currency Selection**: Full support for USD and EUR, localized across the entire application.

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **UI Components**: [React Native Paper](https://reactnativepaper.com/)
- **Charts**: [React Native Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts)
- **Security**: [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) & [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/secure-store/)
- **Icons**: [Lucide React Native](https://lucide.dev/)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Gradients**: [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
- **List Interactions**: [React Native Draggable FlatList](https://github.com/computerjazz/react-native-draggable-flatlist)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app installed on your physical device (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/billi.git
   cd billi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run the app:**
   - Scan the QR code with your **Expo Go** app (iOS/Android).
   - Press `i` to open in the iOS Simulator.
   - Press `a` to open in the Android Emulator.

## 📁 Project Structure

```text
billi/
├── app/               # Expo Router app directory
│   ├── (tabs)/        # Main tab-based navigation
│   │   ├── index.tsx  # Dashboard / Home Screen
│   │   ├── bills.tsx  # Bill Management Screen
│   │   ├── budget.tsx # Budget & Analytics
│   │   └── settings.tsx
│   └── _layout.tsx    # Root layout & Navigation
├── components/        # Reusable UI components
├── constants/         # Theme configurations and global constants
└── assets/            # Images, fonts, and static assets
```

## 🏗️ Future Roadmap (Phase 2 & 3)

- [ ] **Supabase Integration**: Real-time data persistence and database syncing for multiple devices.
- [ ] **Clerk Authentication**: Secure user login with Google/Apple SSO and user profile management.
- [ ] **AI-Powered Insights**: Automated vendor logo fetching and intelligent spending predictions based on history.
- [ ] **Push Notifications**: Smart reminders for upcoming due dates with custom notification sounds.
- [ ] **Export Data**: Export bill history and budget reports to CSV or PDF formats.
- [ ] **Cloud Backup**: Automated backups to Google Drive or iCloud for local-first data security.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
