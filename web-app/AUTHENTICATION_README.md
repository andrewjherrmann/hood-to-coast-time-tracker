# Authentication Features

The Hood to Coast Race Tracker now includes persistent authentication with 24-hour sessions that automatically refresh on user activity.

## Features

### 🔐 **24-Hour Persistent Sessions**
- User authentication state is saved to localStorage
- Sessions persist across page refreshes and browser restarts
- Automatic session expiration after 24 hours

### 🔄 **Automatic Session Refresh**
- Sessions automatically refresh on user activity (clicks, keydown, scroll)
- Session extension happens seamlessly in the background
- No user intervention required for normal usage

### ⚠️ **Session Expiration Warnings**
- Warning banner appears when session expires in less than 30 minutes
- Color-coded time remaining display (green → orange → red)
- Manual session extension option available

### 🛠️ **Manual Session Management**
- Extend session manually at any time
- View detailed session information
- Sign out to clear session immediately

## Usage

### Basic Authentication

```typescript
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const store = useHoodToCoastStore();

// Sign in (automatically saves session)
const success = store.signIn('admin@example.com', 'password');

// Sign out (clears session)
store.signOut();
```

### Session Information

```typescript
// Get detailed session info
const sessionInfo = store.getSessionInfo();
if (sessionInfo) {
  console.log('User:', sessionInfo.user.name);
  console.log('Expires at:', sessionInfo.expiresAt);
  console.log('Time remaining:', sessionInfo.timeRemaining);
  console.log('Is expired:', sessionInfo.isExpired);
}

// Get user-friendly time remaining string
const timeRemaining = store.getSessionTimeRemaining();
// Returns: "23h 45m remaining" or "15m remaining"

// Check if session is expiring soon (less than 30 minutes)
const isExpiringSoon = store.isSessionExpiringSoon();
```

### Session Management

```typescript
// Manually extend session (refreshes 24-hour timer)
const success = store.extendSession();

// Check session validity (called automatically on user activity)
store.checkSessionValidity();
```

## Components

### SessionInfo Component

A ready-to-use component that displays session information:

```vue
<template>
  <SessionInfo />
</template>

<script setup>
import SessionInfo from '../components/SessionInfo.vue';
</script>
```

**Features:**
- Shows user name and email
- Displays time remaining with color coding
- Shows expiration date/time
- Extend session button
- Sign out button
- Warning banner for expiring sessions

## Technical Details

### Storage
- Sessions are stored in localStorage under the key `htc-auth-session`
- Data includes user info, timestamp, and expiration time
- Automatic cleanup of expired sessions

### Security
- Sessions are client-side only (appropriate for mock mode)
- No sensitive data stored in localStorage
- Easy to clear all sessions by signing out

### Performance
- Session checks are lightweight
- Event listeners are only added when needed
- Automatic cleanup prevents memory leaks

## Mock Users

For development and testing, the following users are available:

- **Admin User**: `admin@example.com` / `password`
- **John Doe**: `john@example.com` / `password`
- **Jane Smith**: `jane@example.com` / `password`

## Future Enhancements

When moving to production:
- Replace localStorage with secure HTTP-only cookies
- Add server-side session validation
- Implement refresh token rotation
- Add multi-factor authentication support
- Add session activity logging

## Troubleshooting

### Session Not Persisting
- Check if localStorage is enabled in the browser
- Verify the store is properly initialized
- Check browser console for errors

### Session Expiring Too Quickly
- Verify `SESSION_DURATION` constant (24 hours = 24 * 60 * 60 * 1000 ms)
- Check if user activity events are firing
- Verify `refreshSessionOnActivity` function is working

### Build Errors
- Ensure all new functions are exported from the store
- Check TypeScript types are properly defined
- Verify all imports are correct
