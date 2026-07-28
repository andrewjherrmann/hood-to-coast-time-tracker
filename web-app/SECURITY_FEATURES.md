# Security Features - Hood to Coast Time Tracker

## Overview
This document outlines the security features implemented to protect personal information and control access to sensitive data.

## Route Protection

### Protected Routes
The following routes require authentication and will redirect unauthenticated users to the dashboard:

- **`/legs`** - Legs management page
- **`/runners`** - Runners management page

### Public Routes
These routes are accessible to all users:

- **`/dashboard`** - Main dashboard (limited data view)
- **`/races`** - Race overview (limited data view)
- **`/settings`** - Application settings

### Route Guard Implementation
- Navigation guards check authentication status before allowing access
- Uses localStorage to verify session validity
- Automatic redirect to dashboard for unauthorized access attempts

## Data Protection

### Personal Information Filtering
Runner personal information is automatically filtered based on authentication status:

#### Unauthenticated Users See:
- Runner names
- Estimated pace information
- **Masked email**: `***@***.***`
- **Masked phone**: `***-***-****`

#### Authenticated Users See:
- Full runner information
- Complete email addresses
- Complete phone numbers
- All other runner data

### Data Filtering Implementation
- **Automatic filtering**: Applied through computed properties
- **Real-time updates**: Data filtering updates immediately when authentication state changes
- **Transparent operation**: Filtering happens automatically without manual intervention

## Authentication Flow

### Sign In Process
1. User enters credentials
2. Authentication is verified
3. **Full data access is granted** (`hasFullDataAccess = true`)
4. **Data is automatically reloaded** to get complete information
5. User now sees all personal information

### Sign Out Process
1. User signs out
2. **Data access is revoked** (`hasFullDataAccess = false`)
3. **Personal information is immediately masked**
4. User is redirected to dashboard

### Session Management
- 24-hour persistent sessions using localStorage
- Automatic session refresh on user activity
- Session expiration warnings
- Manual session extension capability

## Technical Implementation

### Store State Management
```typescript
// Data filtering state
const hasFullDataAccess = ref(false);

// Authentication state
const isAuthenticated = ref(false);
const currentUser = ref<User | null>(null);
```

### Data Filtering Functions
```typescript
// Filter runner data based on authentication
function filterRunnerData(runner: Runner): Runner {
  if (hasFullDataAccess.value) {
    return runner; // Full data for authenticated users
  }
  
  // Filtered data for unauthenticated users
  return {
    ...runner,
    email: '***@***.***',
    phone: '***-***-****'
  };
}
```

### Computed Properties
```typescript
// Current race with automatic filtering
const currentRace = computed(() => {
  if (!currentRaceId.value) return null;
  const race = races.value.find(race => race.id === currentRaceId.value);
  return race ? filterRaceData(race) : null;
});
```

## Security Benefits

### Privacy Protection
- **Personal information is never exposed** to unauthenticated users
- **Automatic masking** prevents accidental data leaks
- **Immediate filtering** when authentication state changes

### Access Control
- **Route-level protection** prevents unauthorized page access
- **Data-level protection** ensures sensitive information is filtered
- **Session-based access** with automatic expiration

### User Experience
- **Seamless operation** - filtering happens automatically
- **Immediate feedback** - data updates instantly on auth state change
- **Clear boundaries** - users understand what they can and cannot access

## Testing Security Features

### Verify Route Protection
1. Sign out of the application
2. Try to navigate to `/legs` or `/runners`
3. Should be automatically redirected to dashboard

### Verify Data Filtering
1. **Before authentication**: Check runner information shows masked data
2. **Sign in**: Verify personal information becomes visible
3. **Sign out**: Confirm personal information is masked again

### Verify Data Reload
1. Sign in to the application
2. Check console logs for "Reloading data after authentication"
3. Verify full data is loaded and displayed

## Future Enhancements

### Planned Security Features
- **Role-based access control** for different user types
- **Audit logging** for data access and modifications
- **API rate limiting** to prevent abuse
- **Enhanced session security** with refresh tokens

### Compliance Considerations
- **GDPR compliance** for personal data handling
- **Data retention policies** for user information
- **Privacy policy integration** for user consent
- **Data export/deletion** capabilities for user rights

## Security Best Practices

### Development Guidelines
- Always check `hasFullDataAccess` before displaying personal information
- Use the filtering functions for all data display
- Test authentication flows thoroughly
- Monitor console logs for security-related events

### User Guidelines
- Use strong passwords for authentication
- Sign out when accessing from shared devices
- Report any unexpected data exposure
- Keep authentication sessions secure

---

**Note**: This security implementation ensures that personal information is protected while maintaining a smooth user experience. All filtering happens automatically and transparently based on the user's authentication status.
