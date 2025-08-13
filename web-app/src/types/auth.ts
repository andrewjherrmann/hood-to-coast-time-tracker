// Authentication-related types

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  user: User;
  timestamp: number;
  expiresAt: number;
}

export interface SessionInfo {
  user: User;
  expiresAt: Date;
  timeRemaining: number;
  isExpired: boolean;
}
