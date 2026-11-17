# Billi

## Stack

- **Language / Runtime**: TypeScript 5.9, React 19, React Native 0.81, Node.js with npm
- **Framework**: Expo ~54, Expo Router v6 (file-based routing)
- **UI**: React Native Paper (Material Design 3), Lucide React Native (icons), Expo Linear Gradient
- **Key dependencies**: Clerk (@clerk/clerk-expo) for auth, Supabase for database, React Native Reanimated v4, React Native Gifted Charts (pie charts), React Native Draggable FlatList
- **Package manager**: npm

## Build approach

Mobile-first app with web support, built via Expo. Journey approach: complete user paths for bill management, budgeting, and personal finance tracking across iOS, Android, and web.

## Commands

```bash
# Install
npm install

# Dev server (Expo)
npm start
# or directly:
npx expo start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Run on web
npm run web

# Build for production
eas build
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- **TypeScript strict mode**: all source files require strict types
- **React Context** for global state: UserContext (Clerk ↔ Supabase user sync), UserPreferencesContext (theme, currency, biometrics), BillContext (bills CRUD and Supabase sync)
- **Service layer** for external integrations: `services/clerk.ts`, `services/supabase.ts` handle client setup and token injection
- **Material Design 3** via React Native Paper: all UI components follow Paper conventions (Button, TextInput, Card, etc.)
- **File-based routing** with Expo Router: app directory structure maps to routes
- **Theme system**: dark and light themes defined in constants; theme switching managed in UserPreferencesContext
- **Clerk JWT injection** into Supabase requests via custom fetch wrapper for secure database access
- **Pay period logic** complex (8 occurrence types, semi-monthly config): concentrated in `utils/date.ts` and `context/UserPreferencesContext.tsx`

## Agent skills

- [clerk](.claude/skills/clerk/): `clerk/skills`, Clerk authentication patterns and setup for React/Expo
- [clerk-expo](.claude/skills/clerk-expo/): `clerk/skills`, Clerk integration with Expo and React Native
- [expo-animation](.claude/skills/expo-animation/): `expo/skills`, Animations and gestures in Expo with Reanimated
- [expo-router](.claude/skills/expo-router/): `expo/skills`, File-based routing and navigation with Expo Router
- [supabase](.claude/skills/supabase/): `supabase/agent-skills`, Supabase database and auth setup
- [supabase-postgres-best-practices](.claude/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, PostgreSQL design and optimization for Supabase
- [typescript-advanced-types](.claude/skills/typescript-advanced-types/): `wshobson/agents`, TypeScript type system and strict mode practices
- [vercel-react-native-skills](.claude/skills/vercel-react-native-skills/): `vercel-labs/agent-skills`, React Native best practices and patterns

## Context files

- [context/AGENTS.md](context/AGENTS.md): State management and Clerk ↔ Supabase data syncing (user profiles, bills, preferences)
- [utils/AGENTS.md](utils/AGENTS.md): Date calculations for pay periods and recurrence, currency formatting
- [services/AGENTS.md](services/AGENTS.md): Clerk auth and Supabase database client setup with JWT token injection

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
