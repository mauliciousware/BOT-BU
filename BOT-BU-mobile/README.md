# Bot Bu Mobile (React Native + Expo)

Mobile companion app for Bot Bu — the Binghamton University AI Assistant.

Built with **Expo SDK 52**, **React Native**, and **Expo Router**.

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- Your Next.js backend running (locally or deployed)
- For iOS device testing: Xcode + iPhone or [Expo Go](https://expo.dev/go)

## Getting Started

### 1. Install dependencies

```bash
cd BOT-BU-mobile
npm install
```

### 2. Configure API URL

Open `constants/Api.js` and set your backend URL:

```js
// For local development, use your Mac's local IP address
const DEV_API_URL = 'http://192.168.1.XX:3000';

// For production, use your deployed URL
const PROD_API_URL = 'https://bu-chat-test.vercel.app';
```

To find your local IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 3. Start the Next.js backend

In the parent directory:
```bash
cd ..
pnpm dev
```

### 4. Start the Expo dev server

```bash
npx expo start
```

### 5. Run on device

- **Expo Go (easiest):** Scan the QR code with Expo Go app on your iPhone
- **iOS Simulator:** Press `i` in the terminal
- **Physical device via Xcode:** `npx expo run:ios`

## Project Structure

```
BOT-BU-mobile/
├── app/                  # Expo Router screens
│   ├── _layout.js        # Root layout
│   ├── index.js          # Home screen (ChatInterface)
│   ├── +not-found.js     # 404 screen
│   └── chat/
│       ├── _layout.js    # Chat group layout
│       └── [id].js       # Individual chat (deep link)
├── components/           # React Native components
│   ├── ChatArea.jsx      # Message list + header
│   ├── ChatInterface.jsx # Main orchestrator
│   ├── EmptyState.jsx    # Welcome screen + input
│   ├── Sidebar.jsx       # Chat history drawer
│   ├── UsageDialog.jsx   # API usage stats modal
│   └── ui/               # Reusable UI primitives
│       ├── Avatar.jsx
│       ├── Button.jsx
│       ├── Dialog.jsx
│       ├── ProgressBar.jsx
│       └── ScrollArea.jsx
├── constants/
│   ├── Api.js            # Backend URL config
│   └── Colors.js         # Theme colors (emerald)
├── hooks/
│   ├── useChat.js        # Chat state management
│   ├── useColorScheme.js # Color scheme hook
│   └── useUsageStats.js  # Usage stats fetching
├── lib/
│   ├── apiRouter.js      # Smart API routing (RAG + fallback)
│   └── chatStorage.js    # AsyncStorage-based chat persistence
└── assets/               # Fonts, images
```

## Architecture

```
┌──────────────┐
│  iPhone App  │
│  (Expo/RN)   │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│  Next.js API │
│  (Backend)   │
└──────┬───────┘
       │
  ┌────┼─────┐
  ▼    ▼     ▼
 AI   DB   Files
```

The mobile app is a **UI-only client**. All AI processing, file parsing, and data logic stays on the Next.js server.

## Building for App Store (later)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit -p ios
```

Requires Apple Developer account ($99/year).
