# @ccjk/app

Mobile and web application for CCJK remote control.

## Features

- **Cross-platform**: iOS, Android, and Web
- **Real-time updates**: Socket.IO for live session monitoring
- **Push notifications**: Get notified when AI needs permissions
- **End-to-end encryption**: All data encrypted
- **Session management**: View and control multiple sessions
- **Permission approval**: Approve/deny permissions from mobile

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start Expo dev server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Run on Web
pnpm web
```

### Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Tech Stack

- **Expo**: React Native framework
- **Expo Router**: File-based routing
- **Socket.IO**: Real-time communication
- **TypeScript**: Type safety

## Screens

- **Auth**: GitHub OAuth login
- **Sessions**: List of active sessions
- **Session Detail**: Real-time session monitoring
- **Permissions**: Approve/deny permission requests
- **Settings**: App configuration

## License

MIT
