// Race-related types

export interface Runner {
  id: string;
  name: string;
  email: string;
  phone: string;
  estimatedPaceMinutes: number;
  estimatedPaceSeconds: number;
}

export interface Leg {
  id: string;
  description?: string;
  distance: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  vanNumber?: number;
  estimatedPaceMinutes: number;
  estimatedPaceSeconds: number;
  order: number;
  runnerId?: string; // Now references a runner instead of just runner name
  timeEntry?: TimeEntry; // Direct time entry for this leg
}

export interface TimeEntry {
  timestamp: Date;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  startTime: Date;
  legs: Leg[];
  runners: Runner[];
}

export interface Race {
  id: string;
  name: string;
  date: Date;
  team: Team;
  isActive: boolean;
  locked: boolean;
}
