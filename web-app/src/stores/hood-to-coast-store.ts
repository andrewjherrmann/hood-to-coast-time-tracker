import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Types
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
  actualTime: number;
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

// Store
export const useHoodToCoastStore = defineStore('hood-to-coast', () => {
  // State
  const races = ref<Race[]>([]);
  const currentRaceId = ref<string | null>(null);
  const isMockMode = ref(true);
  const isLoading = ref(false);
  const isAuthenticated = ref(false);
  const currentUser = ref<{ id: string; email: string; name: string } | null>(null);

  // Computed
  const currentRace = computed(() => {
    if (!currentRaceId.value) return null;
    return races.value.find(race => race.id === currentRaceId.value) || null;
  });

  const currentTeam = computed(() => currentRace.value?.team || null);

  const activeRace = computed(() => races.value.find(race => race.isActive) || null);

  // Find the next upcoming race (closest future date)
  const nextUpcomingRace = computed(() => {
    const now = new Date();
    const futureRaces = races.value.filter(race => race.date > now);
    if (futureRaces.length === 0) return null;
    
    return futureRaces.reduce((closest, race) => {
      return race.date < closest.date ? race : closest;
    });
  });

  // Mock data for development
  const mockRaces: Race[] = [
    {
      id: 'htc-2023',
      name: 'Hood to Coast 2023',
      date: new Date('2023-08-25'),
      isActive: false,
      team: {
        id: 'team-htc-2023',
        name: 'Team Thunder 2023',
        startTime: new Date('2023-08-25T06:00:00'),
        runners: [
          { id: 'runner-1-2023', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30 },
          { id: 'runner-2-2023', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 },
          { id: 'runner-3-2023', name: 'Emily Rodriguez', email: 'emily@example.com', phone: '555-0103', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45 },
          { id: 'runner-4-2023', name: 'David Kim', email: 'david@example.com', phone: '555-0104', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0 },
          { id: 'runner-5-2023', name: 'Lisa Thompson', email: 'lisa@example.com', phone: '555-0105', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20 },
          { id: 'runner-6-2023', name: 'James Wilson', email: 'james@example.com', phone: '555-0106', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30 },
          { id: 'runner-7-2023', name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0107', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15 },
          { id: 'runner-8-2023', name: 'Rachel Green', email: 'rachel@example.com', phone: '555-0108', estimatedPaceMinutes: 8, estimatedPaceSeconds: 45 },
          { id: 'runner-9-2023', name: 'Chris Taylor', email: 'chris@example.com', phone: '555-0109', estimatedPaceMinutes: 7, estimatedPaceSeconds: 50 },
          { id: 'runner-10-2023', name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0110', estimatedPaceMinutes: 8, estimatedPaceSeconds: 20 },
          { id: 'runner-11-2023', name: 'Ryan Brown', email: 'ryan@example.com', phone: '555-0111', estimatedPaceMinutes: 7, estimatedPaceSeconds: 35 },
          { id: 'runner-12-2023', name: 'Jessica Davis', email: 'jessica@example.com', phone: '555-0112', estimatedPaceMinutes: 8, estimatedPaceSeconds: 10 }
        ],
        legs: [
          { id: 'leg-1-2023', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-25T06:42:00') },
          { id: 'leg-2-2023', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-25T07:15:00') },
          { id: 'leg-3-2023', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-25T08:05:00') },
          { id: 'leg-4-2023', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-25T09:00:00') },
          { id: 'leg-5-2023', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-25T10:15:00') },
          { id: 'leg-6-2023', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-25T11:30:00') },
          { id: 'leg-7-2023', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-25T13:15:00') },
          { id: 'leg-8-2023', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-25T15:00:00') },
          { id: 'leg-9-2023', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-25T16:45:00') },
          { id: 'leg-10-2023', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-25T18:30:00') },
          { id: 'leg-11-2023', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-25T20:15:00') },
          { id: 'leg-12-2023', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-25T22:00:00') },
          { id: 'leg-13-2023', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-26T00:15:00') },
          { id: 'leg-14-2023', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-26T02:00:00') },
          { id: 'leg-15-2023', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-26T03:45:00') },
          { id: 'leg-16-2023', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-26T05:30:00') },
          { id: 'leg-17-2023', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-26T07:15:00') },
          { id: 'leg-18-2023', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-26T09:00:00') },
          { id: 'leg-19-2023', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-26T11:00:00') },
          { id: 'leg-20-2023', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-26T13:00:00') },
          { id: 'leg-21-2023', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-26T15:00:00') },
          { id: 'leg-22-2023', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-26T17:00:00') },
          { id: 'leg-23-2023', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-26T19:00:00') },
          { id: 'leg-24-2023', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-26T21:00:00') },
          { id: 'leg-25-2023', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-27T00:00:00') },
          { id: 'leg-26-2023', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-27T02:00:00') },
          { id: 'leg-27-2023', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-27T04:00:00') },
          { id: 'leg-28-2023', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-27T06:00:00') },
          { id: 'leg-29-2023', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-27T08:00:00') },
          { id: 'leg-30-2023', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-27T10:00:00') },
          { id: 'leg-31-2023', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-27T12:00:00') },
          { id: 'leg-32-2023', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-27T14:00:00') },
          { id: 'leg-33-2023', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-27T16:00:00') },
          { id: 'leg-34-2023', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-27T18:00:00') },
          { id: 'leg-35-2023', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-27T20:00:00') },
          { id: 'leg-36-2023', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-27T22:00:00') }
        ],
        times: [
          // Create time entries for completed legs
          { id: 'time-1-2023', legId: 'leg-1-2023', runnerId: 'runner-1-2023', actualTime: 42, timestamp: new Date('2023-08-25T06:42:00'), notes: 'Mock completion time' },
          { id: 'time-2-2023', legId: 'leg-2-2023', runnerId: 'runner-2-2023', actualTime: 75, timestamp: new Date('2023-08-25T07:15:00'), notes: 'Mock completion time' },
          { id: 'time-3-2023', legId: 'leg-3-2023', runnerId: 'runner-3-2023', actualTime: 125, timestamp: new Date('2023-08-25T08:05:00'), notes: 'Mock completion time' },
          { id: 'time-4-2023', legId: 'leg-4-2023', runnerId: 'runner-4-2023', actualTime: 180, timestamp: new Date('2023-08-25T09:00:00'), notes: 'Mock completion time' },
          { id: 'time-5-2023', legId: 'leg-5-2023', runnerId: 'runner-5-2023', actualTime: 255, timestamp: new Date('2023-08-25T10:15:00'), notes: 'Mock completion time' },
          { id: 'time-6-2023', legId: 'leg-6-2023', runnerId: 'runner-6-2023', actualTime: 330, timestamp: new Date('2023-08-25T11:30:00'), notes: 'Mock completion time' },
          { id: 'time-7-2023', legId: 'leg-7-2023', runnerId: 'runner-1-2023', actualTime: 435, timestamp: new Date('2023-08-25T13:15:00'), notes: 'Mock completion time' },
          { id: 'time-8-2023', legId: 'leg-8-2023', runnerId: 'runner-2-2023', actualTime: 540, timestamp: new Date('2023-08-25T15:00:00'), notes: 'Mock completion time' },
          { id: 'time-9-2023', legId: 'leg-9-2023', runnerId: 'runner-3-2023', actualTime: 645, timestamp: new Date('2023-08-25T16:45:00'), notes: 'Mock completion time' },
          { id: 'time-10-2023', legId: 'leg-10-2023', runnerId: 'runner-4-2023', actualTime: 750, timestamp: new Date('2023-08-25T18:30:00'), notes: 'Mock completion time' },
          { id: 'time-11-2023', legId: 'leg-11-2023', runnerId: 'runner-5-2023', actualTime: 855, timestamp: new Date('2023-08-25T20:15:00'), notes: 'Mock completion time' },
          { id: 'time-12-2023', legId: 'leg-12-2023', runnerId: 'runner-6-2023', actualTime: 960, timestamp: new Date('2023-08-25T22:00:00'), notes: 'Mock completion time' },
          { id: 'time-13-2023', legId: 'leg-13-2023', runnerId: 'runner-1-2023', actualTime: 1095, timestamp: new Date('2023-08-26T00:15:00'), notes: 'Mock completion time' },
          { id: 'time-14-2023', legId: 'leg-14-2023', runnerId: 'runner-2-2023', actualTime: 1200, timestamp: new Date('2023-08-26T02:00:00'), notes: 'Mock completion time' },
          { id: 'time-15-2023', legId: 'leg-15-2023', runnerId: 'runner-3-2023', actualTime: 1305, timestamp: new Date('2023-08-26T03:45:00'), notes: 'Mock completion time' },
          { id: 'time-16-2023', legId: 'leg-16-2023', runnerId: 'runner-4-2023', actualTime: 1410, timestamp: new Date('2023-08-26T05:30:00'), notes: 'Mock completion time' },
          { id: 'time-17-2023', legId: 'leg-17-2023', runnerId: 'runner-5-2023', actualTime: 1515, timestamp: new Date('2023-08-26T07:15:00'), notes: 'Mock completion time' },
          { id: 'time-18-2023', legId: 'leg-18-2023', runnerId: 'runner-6-2023', actualTime: 1620, timestamp: new Date('2023-08-26T09:00:00'), notes: 'Mock completion time' },
          { id: 'time-19-2023', legId: 'leg-19-2023', runnerId: 'runner-1-2023', actualTime: 1800, timestamp: new Date('2023-08-26T11:00:00'), notes: 'Mock completion time' },
          { id: 'time-20-2023', legId: 'leg-20-2023', runnerId: 'runner-2-2023', actualTime: 1920, timestamp: new Date('2023-08-26T13:00:00'), notes: 'Mock completion time' },
          { id: 'time-21-2023', legId: 'leg-21-2023', runnerId: 'runner-3-2023', actualTime: 2025, timestamp: new Date('2023-08-26T15:00:00'), notes: 'Mock completion time' },
          { id: 'time-22-2023', legId: 'leg-22-2023', runnerId: 'runner-4-2023', actualTime: 2160, timestamp: new Date('2023-08-26T17:00:00'), notes: 'Mock completion time' },
          { id: 'time-23-2023', legId: 'leg-23-2023', runnerId: 'runner-5-2023', actualTime: 2295, timestamp: new Date('2023-08-26T19:00:00'), notes: 'Mock completion time' },
          { id: 'time-24-2023', legId: 'leg-24-2023', runnerId: 'runner-6-2023', actualTime: 2430, timestamp: new Date('2023-08-26T21:00:00'), notes: 'Mock completion time' },
          { id: 'time-25-2023', legId: 'leg-25-2023', runnerId: 'runner-1-2023', actualTime: 2700, timestamp: new Date('2023-08-27T00:00:00'), notes: 'Mock completion time' },
          { id: 'time-26-2023', legId: 'leg-26-2023', runnerId: 'runner-2-2023', actualTime: 2820, timestamp: new Date('2023-08-27T02:00:00'), notes: 'Mock completion time' },
          { id: 'time-27-2023', legId: 'leg-27-2023', runnerId: 'runner-3-2023', actualTime: 2925, timestamp: new Date('2023-08-27T04:00:00'), notes: 'Mock completion time' },
          { id: 'time-28-2023', legId: 'leg-28-2023', runnerId: 'runner-4-2023', actualTime: 3060, timestamp: new Date('2023-08-27T06:00:00'), notes: 'Mock completion time' },
          { id: 'time-29-2023', legId: 'leg-29-2023', runnerId: 'runner-5-2023', actualTime: 3195, timestamp: new Date('2023-08-27T08:00:00'), notes: 'Mock completion time' },
          { id: 'time-30-2023', legId: 'leg-30-2023', runnerId: 'runner-6-2023', actualTime: 3330, timestamp: new Date('2023-08-27T10:00:00'), notes: 'Mock completion time' },
          { id: 'time-31-2023', legId: 'leg-31-2023', runnerId: 'runner-1-2023', actualTime: 3540, timestamp: new Date('2023-08-27T12:00:00'), notes: 'Mock completion time' },
          { id: 'time-32-2023', legId: 'leg-32-2023', runnerId: 'runner-2-2023', actualTime: 3660, timestamp: new Date('2023-08-27T14:00:00'), notes: 'Mock completion time' },
          { id: 'time-33-2023', legId: 'leg-33-2023', runnerId: 'runner-3-2023', actualTime: 3765, timestamp: new Date('2023-08-27T16:00:00'), notes: 'Mock completion time' },
          { id: 'time-34-2023', legId: 'leg-34-2023', runnerId: 'runner-4-2023', actualTime: 3900, timestamp: new Date('2023-08-27T18:00:00'), notes: 'Mock completion time' },
          { id: 'time-35-2023', legId: 'leg-35-2023', runnerId: 'runner-5-2023', actualTime: 4035, timestamp: new Date('2023-08-27T20:00:00'), notes: 'Mock completion time' },
          { id: 'time-36-2023', legId: 'leg-36-2023', runnerId: 'runner-6-2023', actualTime: 4140, timestamp: new Date('2023-08-27T22:00:00'), notes: 'Mock completion time' }
        ]
      }
    },
    {
      id: 'htc-2024',
      name: 'Hood to Coast 2024',
      date: new Date('2024-08-23'),
      isActive: false,
      team: {
        id: 'team-htc-2024',
        name: 'Team Lightning 2024',
        startTime: new Date('2024-08-23T06:00:00'),
        runners: [
          { id: 'runner-1-2024', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15 },
          { id: 'runner-2-2024', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0 },
          { id: 'runner-3-2024', name: 'Emily Rodriguez', email: 'emily@example.com', phone: '555-0103', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30 },
          { id: 'runner-4-2024', name: 'David Kim', email: 'david@example.com', phone: '555-0104', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45 },
          { id: 'runner-5-2024', name: 'Lisa Thompson', email: 'lisa@example.com', phone: '555-0105', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0 },
          { id: 'runner-6-2024', name: 'James Wilson', email: 'james@example.com', phone: '555-0106', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 },
          { id: 'runner-7-2024', name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0107', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0 },
          { id: 'runner-8-2024', name: 'Rachel Green', email: 'rachel@example.com', phone: '555-0108', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30 },
          { id: 'runner-9-2024', name: 'Chris Taylor', email: 'chris@example.com', phone: '555-0109', estimatedPaceMinutes: 7, estimatedPaceSeconds: 25 },
          { id: 'runner-10-2024', name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0110', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 },
          { id: 'runner-11-2024', name: 'Ryan Brown', email: 'ryan@example.com', phone: '555-0111', estimatedPaceMinutes: 7, estimatedPaceSeconds: 40 },
          { id: 'runner-12-2024', name: 'Jessica Davis', email: 'jessica@example.com', phone: '555-0112', estimatedPaceMinutes: 8, estimatedPaceSeconds: 5 }
        ],
        legs: [
          { id: 'leg-1-2024', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-23T06:41:00') },
          { id: 'leg-2-2024', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-23T07:14:00') },
          { id: 'leg-3-2024', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-23T08:03:00') },
          { id: 'leg-4-2024', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-23T08:58:00') },
          { id: 'leg-5-2024', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-23T10:12:00') },
          { id: 'leg-6-2024', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-23T11:28:00') },
          { id: 'leg-7-2024', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-23T13:14:00') },
          { id: 'leg-8-2024', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-23T15:00:00') },
          { id: 'leg-9-2024', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-23T16:44:00') },
          { id: 'leg-10-2024', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-23T18:28:00') },
          { id: 'leg-11-2024', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-23T20:12:00') },
          { id: 'leg-12-2024', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-23T22:00:00') },
          { id: 'leg-13-2024', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-24T00:14:00') },
          { id: 'leg-14-2024', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-24T01:59:00') },
          { id: 'leg-15-2024', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-24T03:44:00') },
          { id: 'leg-16-2024', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-24T05:28:00') },
          { id: 'leg-17-2024', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-24T07:12:00') },
          { id: 'leg-18-2024', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-24T09:00:00') },
          { id: 'leg-19-2024', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-24T10:59:00') },
          { id: 'leg-20-2024', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-24T13:00:00') },
          { id: 'leg-21-2024', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-24T15:00:00') },
          { id: 'leg-22-2024', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-24T17:00:00') },
          { id: 'leg-23-2024', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-24T19:00:00') },
          { id: 'leg-24-2024', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-24T21:00:00') },
          { id: 'leg-25-2024', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-25T00:00:00') },
          { id: 'leg-26-2024', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-25T02:00:00') },
          { id: 'leg-27-2024', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-25T04:00:00') },
          { id: 'leg-28-2024', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-25T06:00:00') },
          { id: 'leg-29-2024', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-25T08:00:00') },
          { id: 'leg-30-2024', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-25T10:00:00') },
          { id: 'leg-31-2024', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-25T12:00:00') },
          { id: 'leg-32-2024', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-25T14:00:00') },
          { id: 'leg-33-2024', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-25T16:00:00') },
          { id: 'leg-34-2024', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-25T18:00:00') },
          { id: 'leg-35-2024', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-25T20:00:00') },
          { id: 'leg-36-2024', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-25T22:00:00') }
        ],
        times: []
      }
    },
    {
      id: 'htc-2025',
      name: 'Hood to Coast 2025',
      date: new Date('2025-08-22'),
      isActive: true,
      team: {
        id: 'team-htc-2025',
        name: 'Team Thunder 2025',
        startTime: new Date('2025-08-22T06:00:00'),
        runners: [
          { id: 'runner-1-2025', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0 },
          { id: 'runner-2-2025', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45 },
          { id: 'runner-3-2025', name: 'Emily Rodriguez', email: 'emily@example.com', phone: '555-0103', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15 },
          { id: 'runner-4-2025', name: 'David Kim', email: 'david@example.com', phone: '555-0104', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30 },
          { id: 'runner-5-2025', name: 'Lisa Thompson', email: 'lisa@example.com', phone: '555-0105', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45 },
          { id: 'runner-6-2025', name: 'James Wilson', email: 'james@example.com', phone: '555-0106', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0 },
          { id: 'runner-7-2025', name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0107', estimatedPaceMinutes: 6, estimatedPaceSeconds: 50 },
          { id: 'runner-8-2025', name: 'Rachel Green', email: 'rachel@example.com', phone: '555-0108', estimatedPaceMinutes: 8, estimatedPaceSeconds: 25 },
          { id: 'runner-9-2025', name: 'Chris Taylor', email: 'chris@example.com', phone: '555-0109', estimatedPaceMinutes: 7, estimatedPaceSeconds: 10 },
          { id: 'runner-10-2025', name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0110', estimatedPaceMinutes: 8, estimatedPaceSeconds: 10 },
          { id: 'runner-11-2025', name: 'Ryan Brown', email: 'ryan@example.com', phone: '555-0111', estimatedPaceMinutes: 7, estimatedPaceSeconds: 25 },
          { id: 'runner-12-2025', name: 'Jessica Davis', email: 'jessica@example.com', phone: '555-0112', estimatedPaceMinutes: 8, estimatedPaceSeconds: 20 }
        ],
        legs: [
          { id: 'leg-1-2025', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-2-2025', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-3-2025', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-4-2025', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-5-2025', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-6-2025', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false },
          { id: 'leg-7-2025', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-8-2025', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-9-2025', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-10-2025', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-11-2025', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-12-2025', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false },
          { id: 'leg-13-2025', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-14-2025', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-15-2025', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-16-2025', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-17-2025', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-18-2025', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false },
          { id: 'leg-19-2025', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-20-2025', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-21-2025', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-22-2025', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-23-2025', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-24-2025', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false },
          { id: 'leg-25-2025', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-26-2025', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-27-2025', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-28-2025', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-29-2025', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-30-2025', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false },
          { id: 'leg-31-2025', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', estimatedPaceMinutes: 7, estimatedPaceSeconds: 0, runnerId: 'runner-1-2025', isCompleted: false },
          { id: 'leg-32-2025', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-2-2025', isCompleted: false },
          { id: 'leg-33-2025', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15, runnerId: 'runner-3-2025', isCompleted: false },
          { id: 'leg-34-2025', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-4-2025', isCompleted: false },
          { id: 'leg-35-2025', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', estimatedPaceMinutes: 6, estimatedPaceSeconds: 45, runnerId: 'runner-5-2025', isCompleted: false },
          { id: 'leg-36-2025', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-6-2025', isCompleted: false }
        ],
        times: []
      }
    }
  ];

  // Initialize with mock data
  if (isMockMode.value) {
    races.value = [...mockRaces];
    
    // Automatically set the next upcoming race as active
    const upcoming = nextUpcomingRace.value;
    if (upcoming) {
      upcoming.isActive = true;
      currentRaceId.value = upcoming.id;
    } else {
      // Fallback to first race if no upcoming races
      currentRaceId.value = races.value[0]?.id || null;
    }
  }

  // Computed
  const totalDistance = computed(() => {
    if (!currentTeam.value) return 0;
    return currentTeam.value.legs.reduce((total, leg) => total + leg.distance, 0);
  });

  const completedLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => leg.isCompleted);
  });

  const remainingLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => !leg.isCompleted);
  });

  const currentLeg = computed(() => {
    if (!currentTeam.value) return null;
    return currentTeam.value.legs.find(leg => !leg.isCompleted);
  });

  // Helper function to calculate estimated time from pace and distance
  function calculateEstimatedTime(paceMinutes: number, paceSeconds: number, distance: number): number {
    const totalPaceSeconds = paceMinutes * 60 + paceSeconds;
    const totalSeconds = totalPaceSeconds * distance;
    return Math.round(totalSeconds / 60); // Return in minutes
  }

  // Helper function to get estimated time for a specific leg
  function getLegEstimatedTime(leg: Leg): number {
    return calculateEstimatedTime(leg.estimatedPaceMinutes, leg.estimatedPaceSeconds, leg.distance);
  }

  // Helper function to get estimated time for a leg based on assigned runner's pace
  function getLegEstimatedTimeByRunner(leg: Leg): number | null {
    if (!leg.runnerId || !currentTeam.value) return null;
    
    const runner = currentTeam.value.runners.find(r => r.id === leg.runnerId);
    if (!runner) return null;
    
    return calculateEstimatedTime(runner.estimatedPaceMinutes, runner.estimatedPaceSeconds, leg.distance);
  }

  // Helper function to get actual time for a completed leg in minutes
  function getLegActualTime(leg: Leg): number | null {
    if (!leg.isCompleted || !currentTeam.value) return null;
    
    // Find the corresponding time entry to get the actual time in minutes
    const timeEntry = currentTeam.value.times.find(t => t.legId === leg.id);
    if (!timeEntry) return null;
    
    // The actualTime field now stores minutes directly
    return timeEntry.actualTime;
  }

  // Helper function to compare estimated vs actual time for a leg
  function getLegTimeComparison(leg: Leg): {
    estimatedMinutes: number;
    actualMinutes: number | null;
    differenceMinutes: number | null;
    isFaster: boolean | null;
    percentageDifference: number | null;
  } {
    const estimatedByRunner = getLegEstimatedTimeByRunner(leg);
    const estimatedByLeg = getLegEstimatedTime(leg);
    const estimatedMinutes = estimatedByRunner || estimatedByLeg;
    const actualMinutes = getLegActualTime(leg);
    
    if (actualMinutes === null) {
      return {
        estimatedMinutes,
        actualMinutes: null,
        differenceMinutes: null,
        isFaster: null,
        percentageDifference: null
      };
    }
    
    const differenceMinutes = actualMinutes - estimatedMinutes;
    const isFaster = differenceMinutes < 0;
    const percentageDifference = ((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100;
    
    return {
      estimatedMinutes,
      actualMinutes,
      differenceMinutes,
      isFaster,
      percentageDifference
    };
  }

  // Overall team performance metrics
  const teamPerformanceMetrics = computed(() => {
    if (!currentTeam.value) return null;
    
    const completedLegsWithTimes = currentTeam.value.legs.filter(leg => leg.isCompleted);
    if (completedLegsWithTimes.length === 0) return null;
    
    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
    let fasterLegs = 0;
    let slowerLegs = 0;
    let onPaceLegs = 0;
    
    completedLegsWithTimes.forEach(leg => {
      const comparison = getLegTimeComparison(leg);
      if (comparison.actualMinutes !== null) {
        totalEstimatedMinutes += comparison.estimatedMinutes;
        totalActualMinutes += comparison.actualMinutes;
        
        if (comparison.isFaster === true) {
          fasterLegs++;
        } else if (comparison.isFaster === false) {
          slowerLegs++;
        } else {
          onPaceLegs++;
        }
      }
    });
    
    const totalDifferenceMinutes = totalActualMinutes - totalEstimatedMinutes;
    const overallPercentageDifference = totalEstimatedMinutes > 0 
      ? ((totalActualMinutes - totalEstimatedMinutes) / totalEstimatedMinutes) * 100 
      : 0;
    
    return {
      totalEstimatedMinutes,
      totalActualMinutes,
      totalDifferenceMinutes,
      overallPercentageDifference,
      fasterLegs,
      slowerLegs,
      onPaceLegs,
      totalLegs: completedLegsWithTimes.length,
      averagePaceDifference: completedLegsWithTimes.length > 0 
        ? totalDifferenceMinutes / completedLegsWithTimes.length 
        : 0
    };
  });

  // Individual runner performance
  const runnerPerformanceMetrics = computed(() => {
    if (!currentTeam.value) return [];
    
    return currentTeam.value.runners.map(runner => {
      const runnerLegs = currentTeam.value!.legs.filter(leg => 
        leg.runnerId === runner.id && leg.isCompleted
      );
      
      if (runnerLegs.length === 0) {
        return {
          runnerId: runner.id,
          runnerName: runner.name,
          completedLegs: 0,
          totalEstimatedMinutes: 0,
          totalActualMinutes: 0,
          averagePaceDifference: 0,
          fasterLegs: 0,
          slowerLegs: 0
        };
      }
      
      let totalEstimatedMinutes = 0;
      let totalActualMinutes = 0;
      let fasterLegs = 0;
      let slowerLegs = 0;
      
      runnerLegs.forEach(leg => {
        const comparison = getLegTimeComparison(leg);
        if (comparison.actualMinutes !== null) {
          totalEstimatedMinutes += comparison.estimatedMinutes;
          totalActualMinutes += comparison.actualMinutes;
          
          if (comparison.isFaster === true) {
            fasterLegs++;
          } else if (comparison.isFaster === false) {
            slowerLegs++;
          }
        }
      });
      
      const averagePaceDifference = runnerLegs.length > 0 
        ? (totalActualMinutes - totalEstimatedMinutes) / runnerLegs.length 
        : 0;
      
      return {
        runnerId: runner.id,
        runnerName: runner.name,
        completedLegs: runnerLegs.length,
        totalEstimatedMinutes,
        totalActualMinutes,
        averagePaceDifference,
        fasterLegs,
        slowerLegs
      };
    });
  });

  const estimatedFinishTime = computed(() => {
    if (!currentTeam.value || !currentTeam.value.startTime) return null;
    
    const totalEstimatedMinutes = currentTeam.value.legs.reduce((total, leg) => {
      if (leg.runnerId) {
        const runner = currentTeam.value!.runners.find(r => r.id === leg.runnerId);
        if (runner) {
          const pacePerMile = runner.estimatedPaceMinutes + (runner.estimatedPaceSeconds / 60);
          return total + (leg.distance * pacePerMile);
        }
      }
      // Calculate estimated time from leg's pace
      return total + calculateEstimatedTime(leg.estimatedPaceMinutes, leg.estimatedPaceSeconds, leg.distance);
    }, 0);
    
    const finishTime = new Date(currentTeam.value.startTime);
    finishTime.setMinutes(finishTime.getMinutes() + totalEstimatedMinutes);
    return finishTime;
  });

  const progressPercentage = computed(() => {
    if (!currentTeam.value || currentTeam.value.legs.length === 0) return 0;
    return (completedLegs.value.length / currentTeam.value.legs.length) * 100;
  });

  // Actions
  function addRunner(runner: Omit<Runner, 'id'>) {
    if (!currentTeam.value) return;
    
    const newRunner: Runner = {
      ...runner,
      id: `runner-${Date.now()}`
    };
    
    currentTeam.value.runners.push(newRunner);
  }

  function updateRunner(id: string, updates: Partial<Omit<Runner, 'id'>>) {
    if (!currentTeam.value) return;
    
    const runner = currentTeam.value.runners.find(r => r.id === id);
    if (runner) {
      Object.assign(runner, updates);
    }
  }

  function deleteRunner(id: string) {
    if (!currentTeam.value) return;
    
    // Remove runner from legs first
    currentTeam.value.legs.forEach(leg => {
      if (leg.runnerId === id) {
        delete leg.runnerId;
      }
    });
    
    // Remove runner from times
    currentTeam.value.times = currentTeam.value.times.filter(time => time.runnerId !== id);
    
    // Remove runner
    currentTeam.value.runners = currentTeam.value.runners.filter(r => r.id !== id);
  }

  function assignRunnerToLeg(legId: string, runnerId: string | undefined) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      if (runnerId) {
        leg.runnerId = runnerId;
        // Note: We don't update the leg's pace when assigning a runner
        // The leg keeps its own pace, but we can calculate estimated time
        // based on either the leg's pace or the runner's pace
      } else {
        delete leg.runnerId;
      }
    }
  }

  function reorderLegs(newOrder: string[]) {
    if (!currentTeam.value) return;
    
    // Create a map of leg ID to new order
    const orderMap = new Map<string, number>();
    newOrder.forEach((legId, index) => {
      orderMap.set(legId, index + 1);
    });
    
    // Update the order of all legs
    currentTeam.value.legs.forEach(leg => {
      if (orderMap.has(leg.id)) {
        leg.order = orderMap.get(leg.id)!;
      }
    });
    
    // Sort legs by new order
    currentTeam.value.legs.sort((a, b) => a.order - b.order);
  }

  function completeLeg(legId: string, actualTime: number, runnerId: string) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      leg.isCompleted = true;
      leg.actualTime = new Date(actualTime);
      leg.runnerId = runnerId;
      
      // Add time entry
      const timeEntry: TimeEntry = {
        id: `time-${Date.now()}`,
        legId,
        runnerId,
        actualTime,
        timestamp: new Date(),
        notes: ''
      };
      
      currentTeam.value.times.push(timeEntry);
    }
  }

  function updateLeg(id: string, updates: Partial<Omit<Leg, 'id' | 'order' | 'isCompleted'>>) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === id);
    if (leg) {
      Object.assign(leg, updates);
      // Note: We no longer update estimated time automatically
      // The leg's pace determines the estimated time
    }
  }

  function deleteLeg(id: string) {
    if (!currentTeam.value) return;
    
    // Remove associated times
    currentTeam.value.times = currentTeam.value.times.filter(time => time.legId !== id);
    
    // Remove leg
    currentTeam.value.legs = currentTeam.value.legs.filter(leg => leg.id !== id);
    
    // Reorder remaining legs
    currentTeam.value.legs.forEach((leg, index) => {
      leg.order = index + 1;
    });
  }

  function addLeg(leg: Omit<Leg, 'id' | 'order' | 'isCompleted'>) {
    if (!currentTeam.value) return;
    
    const newLeg: Leg = {
      ...leg,
      id: `leg-${Date.now()}`,
      order: currentTeam.value.legs.length + 1,
      isCompleted: false
    };
    
    currentTeam.value.legs.push(newLeg);
  }

  function addTime(time: Omit<TimeEntry, 'id' | 'timestamp'>) {
    if (!currentTeam.value) return;
    
    const newTime: TimeEntry = {
      ...time,
      id: `time-${Date.now()}`,
      timestamp: new Date()
    };
    
    currentTeam.value.times.push(newTime);
    
    // Mark leg as completed
    const leg = currentTeam.value.legs.find(l => l.id === time.legId);
    if (leg) {
      leg.isCompleted = true;
      leg.actualTime = new Date(time.actualTime);
      leg.runnerId = time.runnerId;
    }
  }

  function deleteTime(timeId: string) {
    if (!currentTeam.value) return;
    
    const time = currentTeam.value.times.find(t => t.id === timeId);
    if (time) {
      // Remove time entry
      currentTeam.value.times = currentTeam.value.times.filter(t => t.id !== timeId);
      
      // Mark leg as incomplete if this was the completion time
      const leg = currentTeam.value.legs.find(l => l.id === time.legId);
      if (leg && leg.isCompleted) {
        leg.isCompleted = false;
        delete leg.actualTime;
        delete leg.runnerId;
      }
    }
  }

  function clearAllData() {
    if (!currentTeam.value) return;
    
    currentTeam.value.legs.forEach(leg => {
      leg.isCompleted = false;
      delete leg.actualTime;
      delete leg.runnerId;
    });
    
    currentTeam.value.times = [];
  }

  function toggleMockMode() {
    isMockMode.value = !isMockMode.value;
    // Remove automatic authentication - users should sign in manually even in mock mode
    // isAuthenticated.value = true;
    // currentUser.value = { id: 'user-1', email: 'admin@example.com', name: 'Admin User' };
  }

  // Mock users for development
  const mockUsers = [
    { id: 'user-1', email: 'admin@example.com', password: 'password', name: 'Admin User' },
    { id: 'user-2', email: 'john@example.com', password: 'password', name: 'John Doe' },
    { id: 'user-3', email: 'jane@example.com', password: 'password', name: 'Jane Smith' }
  ];

  function signIn(email: string, password: string) {
    // Mock authentication
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      isAuthenticated.value = true;
      currentUser.value = { id: user.id, email: user.email, name: user.name };
      return true;
    }
    return false;
  }

  function signOut() {
    isAuthenticated.value = false;
    currentUser.value = null;
  }

  // Race management functions
  function createRace(raceData: Omit<Race, 'id' | 'isActive'>) {
    const newRace: Race = {
      ...raceData,
      id: `race-${Date.now()}`,
      isActive: false
    };
    
    races.value.push(newRace);
    return newRace;
  }

  function duplicateRace(raceId: string, newName: string, newDate: Date) {
    const sourceRace = races.value.find(r => r.id === raceId);
    if (!sourceRace) return null;

    // Deep clone the race data
    const duplicatedRace: Race = {
      id: `race-${Date.now()}`,
      name: newName,
      date: newDate,
      isActive: false,
      team: {
        ...sourceRace.team,
        id: `team-${Date.now()}`,
        startTime: new Date(newDate.getTime() + (sourceRace.team.startTime.getTime() - sourceRace.date.getTime())),
        legs: sourceRace.team.legs.map(leg => ({
          ...leg,
          id: `leg-${Date.now()}-${Math.random()}`,
          isCompleted: false
        })),
        times: [],
        runners: sourceRace.team.runners.map(runner => ({
          ...runner,
          id: `runner-${Date.now()}-${Math.random()}`
        }))
      }
    };

    races.value.push(duplicatedRace);
    return duplicatedRace;
  }

  function setCurrentRace(raceId: string) {
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      currentRaceId.value = raceId;
    }
  }

  function updateRace(raceId: string, updates: Partial<Omit<Race, 'id'>>) {
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      Object.assign(race, updates);
    }
  }

  function deleteRace(raceId: string) {
    const raceIndex = races.value.findIndex(r => r.id === raceId);
    if (raceIndex !== -1) {
      races.value.splice(raceIndex, 1);
      
      // If we deleted the current race, set to first available
      if (currentRaceId.value === raceId) {
        currentRaceId.value = races.value[0]?.id || null;
      }
    }
  }

  function recordLegCompletionTime(legId: string, completionTime: Date) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg && !leg.isCompleted) {
      leg.isCompleted = true;
      leg.actualTime = completionTime;
      
      // Calculate the actual completion time in minutes from race start
      const startTime = new Date(currentTeam.value.startTime);
      const actualTimeMinutes = Math.round((completionTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      const timeEntry: TimeEntry = {
        id: `time-${Date.now()}`,
        legId: leg.id,
        runnerId: leg.runnerId || '',
        actualTime: actualTimeMinutes, // Store in minutes, not milliseconds
        timestamp: new Date(),
        notes: 'Recorded from dashboard'
      };
      
      currentTeam.value.times.push(timeEntry);
    }
  }

  function setActiveRace(raceId: string) {
    // Set all races as inactive first
    races.value.forEach(race => {
      race.isActive = false;
    });
    
    // Set the selected race as active
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      race.isActive = true;
    }
  }

  return {
    // State
    races,
    currentRaceId,
    isMockMode,
    isLoading,
    isAuthenticated,
    currentUser,
    
    // Computed
    currentRace,
    currentTeam,
    activeRace,
    totalDistance,
    completedLegs,
    remainingLegs,
    currentLeg,
    estimatedFinishTime,
    progressPercentage,
    teamPerformanceMetrics,
    runnerPerformanceMetrics,
    
    // Helper functions
    calculateEstimatedTime,
    getLegEstimatedTime,
    getLegEstimatedTimeByRunner,
    getLegActualTime,
    getLegTimeComparison,
    
    // Actions
    addRunner,
    updateRunner,
    deleteRunner,
    assignRunnerToLeg,
    reorderLegs,
    completeLeg,
    updateLeg,
    deleteLeg,
    addLeg,
    addTime,
    deleteTime,
    clearAllData,
    toggleMockMode,
    signIn,
    signOut,
    createRace,
    duplicateRace,
    setCurrentRace,
    updateRace,
    deleteRace,
    recordLegCompletionTime,
    setActiveRace
  };
});
