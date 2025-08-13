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
  isCompleted: boolean;
  actualTime?: Date;
  runnerId?: string; // Now references a runner instead of just runner name
}

export interface TimeEntry {
  id: string;
  legId: string;
  runnerId: string;
  actualTime: number; // Individual leg completion time in minutes
  cumulativeTime?: number; // Cumulative time from race start in minutes (optional)
  timestamp: Date;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  startTime: Date;
  legs: Leg[];
  times: TimeEntry[];
  runners: Runner[];
}

export interface Race {
  id: string;
  name: string;
  date: Date;
  team: Team;
  isActive: boolean;
}
