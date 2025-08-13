import type { Race } from './hood-to-coast-store';

// Mock data for development
export const mockRaces: Race[] = [
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
        // Van 1 - Legs 1-6
        { id: 'leg-1-2023', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-25T06:42:00') },
        { id: 'leg-2-2023', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-25T07:15:00') },
        { id: 'leg-3-2023', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-25T08:05:00') },
        { id: 'leg-4-2023', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-25T09:00:00') },
        { id: 'leg-5-2023', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-25T10:15:00') },
        { id: 'leg-6-2023', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-25T11:30:00') },
        
        // Van 2 - Legs 7-12
        { id: 'leg-7-2023', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2023', isCompleted: true, actualTime: new Date('2023-08-25T13:15:00') },
        { id: 'leg-8-2023', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2023', isCompleted: true, actualTime: new Date('2023-08-25T15:00:00') },
        { id: 'leg-9-2023', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2023', isCompleted: true, actualTime: new Date('2023-08-25T16:45:00') },
        { id: 'leg-10-2023', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2023', isCompleted: true, actualTime: new Date('2023-08-25T18:30:00') },
        { id: 'leg-11-2023', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2023', isCompleted: true, actualTime: new Date('2023-08-25T20:15:00') },
        { id: 'leg-12-2023', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2023', isCompleted: true, actualTime: new Date('2023-08-25T22:00:00') },
        
        // Van 1 - Legs 13-18 (second rotation)
        { id: 'leg-13-2023', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-26T00:15:00') },
        { id: 'leg-14-2023', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-26T02:00:00') },
        { id: 'leg-15-2023', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-26T03:45:00') },
        { id: 'leg-16-2023', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-26T05:30:00') },
        { id: 'leg-17-2023', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-26T07:15:00') },
        { id: 'leg-18-2023', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-26T09:00:00') },
        
        // Van 2 - Legs 19-24 (second rotation)
        { id: 'leg-19-2023', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2023', isCompleted: true, actualTime: new Date('2023-08-26T11:00:00') },
        { id: 'leg-20-2023', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2023', isCompleted: true, actualTime: new Date('2023-08-26T13:00:00') },
        { id: 'leg-21-2023', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2023', isCompleted: true, actualTime: new Date('2023-08-26T15:00:00') },
        { id: 'leg-22-2023', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2023', isCompleted: true, actualTime: new Date('2023-08-26T17:00:00') },
        { id: 'leg-23-2023', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2023', isCompleted: true, actualTime: new Date('2023-08-26T19:00:00') },
        { id: 'leg-24-2023', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2023', isCompleted: true, actualTime: new Date('2023-08-26T21:00:00') },
        
        // Van 1 - Legs 25-30 (third rotation)
        { id: 'leg-25-2023', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', isCompleted: true, actualTime: new Date('2023-08-27T00:00:00') },
        { id: 'leg-26-2023', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', isCompleted: true, actualTime: new Date('2023-08-27T02:00:00') },
        { id: 'leg-27-2023', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2023', isCompleted: true, actualTime: new Date('2023-08-27T04:00:00') },
        { id: 'leg-28-2023', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2023', isCompleted: true, actualTime: new Date('2023-08-27T06:00:00') },
        { id: 'leg-29-2023', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2023', isCompleted: true, actualTime: new Date('2023-08-27T08:00:00') },
        { id: 'leg-30-2023', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2023', isCompleted: true, actualTime: new Date('2023-08-27T10:00:00') },
        
        // Van 2 - Legs 31-36 (third rotation)
        { id: 'leg-31-2023', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2023', isCompleted: true, actualTime: new Date('2023-08-27T12:00:00') },
        { id: 'leg-32-2023', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2023', isCompleted: true, actualTime: new Date('2023-08-27T14:00:00') },
        { id: 'leg-33-2023', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2023', isCompleted: true, actualTime: new Date('2023-08-27T16:00:00') },
        { id: 'leg-34-2023', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2023', isCompleted: true, actualTime: new Date('2023-08-27T18:00:00') },
        { id: 'leg-35-2023', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2023', isCompleted: true, actualTime: new Date('2023-08-27T20:00:00') },
        { id: 'leg-36-2023', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2023', isCompleted: true, actualTime: new Date('2023-08-27T22:00:00') }
      ],
      times: [
        // Time entries with cumulative times
        { id: 'time-1-2023', legId: 'leg-1-2023', runnerId: 'runner-1-2023', actualTime: 42, cumulativeTime: 42, timestamp: new Date('2023-08-25T06:42:00'), notes: 'Mock completion time' },
        { id: 'time-2-2023', legId: 'leg-2-2023', runnerId: 'runner-2-2023', actualTime: 33, cumulativeTime: 75, timestamp: new Date('2023-08-25T07:15:00'), notes: 'Mock completion time' },
        { id: 'time-3-2023', legId: 'leg-3-2023', runnerId: 'runner-3-2023', actualTime: 50, cumulativeTime: 125, timestamp: new Date('2023-08-25T08:05:00'), notes: 'Mock completion time' },
        { id: 'time-4-2023', legId: 'leg-4-2023', runnerId: 'runner-4-2023', actualTime: 55, cumulativeTime: 180, timestamp: new Date('2023-08-25T09:00:00'), notes: 'Mock completion time' },
        { id: 'time-5-2023', legId: 'leg-5-2023', runnerId: 'runner-5-2023', actualTime: 75, cumulativeTime: 255, timestamp: new Date('2023-08-25T10:15:00'), notes: 'Mock completion time' },
        { id: 'time-6-2023', legId: 'leg-6-2023', runnerId: 'runner-6-2023', actualTime: 75, cumulativeTime: 330, timestamp: new Date('2023-08-25T11:30:00'), notes: 'Mock completion time' },
        { id: 'time-7-2023', legId: 'leg-7-2023', runnerId: 'runner-7-2023', actualTime: 105, cumulativeTime: 435, timestamp: new Date('2023-08-25T13:15:00'), notes: 'Mock completion time' },
        { id: 'time-8-2023', legId: 'leg-8-2023', runnerId: 'runner-8-2023', actualTime: 105, cumulativeTime: 540, timestamp: new Date('2023-08-25T15:00:00'), notes: 'Mock completion time' },
        { id: 'time-9-2023', legId: 'leg-9-2023', runnerId: 'runner-9-2023', actualTime: 105, cumulativeTime: 645, timestamp: new Date('2023-08-25T16:45:00'), notes: 'Mock completion time' },
        { id: 'time-10-2023', legId: 'leg-10-2023', runnerId: 'runner-10-2023', actualTime: 105, cumulativeTime: 750, timestamp: new Date('2023-08-25T18:30:00'), notes: 'Mock completion time' },
        { id: 'time-11-2023', legId: 'leg-11-2023', runnerId: 'runner-11-2023', actualTime: 105, cumulativeTime: 855, timestamp: new Date('2023-08-25T20:15:00'), notes: 'Mock completion time' },
        { id: 'time-12-2023', legId: 'leg-12-2023', runnerId: 'runner-12-2023', actualTime: 105, cumulativeTime: 960, timestamp: new Date('2023-08-25T22:00:00'), notes: 'Mock completion time' },
        { id: 'time-13-2023', legId: 'leg-13-2023', runnerId: 'runner-1-2023', actualTime: 135, cumulativeTime: 1095, timestamp: new Date('2023-08-26T00:15:00'), notes: 'Mock completion time' },
        { id: 'time-14-2023', legId: 'leg-14-2023', runnerId: 'runner-2-2023', actualTime: 105, cumulativeTime: 1200, timestamp: new Date('2023-08-26T02:00:00'), notes: 'Mock completion time' },
        { id: 'time-15-2023', legId: 'leg-15-2023', runnerId: 'runner-3-2023', actualTime: 105, cumulativeTime: 1305, timestamp: new Date('2023-08-26T03:45:00'), notes: 'Mock completion time' },
        { id: 'time-16-2023', legId: 'leg-16-2023', runnerId: 'runner-4-2023', actualTime: 105, cumulativeTime: 1410, timestamp: new Date('2023-08-26T05:30:00'), notes: 'Mock completion time' },
        { id: 'time-17-2023', legId: 'leg-17-2023', runnerId: 'runner-5-2023', actualTime: 105, cumulativeTime: 1515, timestamp: new Date('2023-08-26T07:15:00'), notes: 'Mock completion time' },
        { id: 'time-18-2023', legId: 'leg-18-2023', runnerId: 'runner-6-2023', actualTime: 105, cumulativeTime: 1620, timestamp: new Date('2023-08-26T09:00:00'), notes: 'Mock completion time' },
        { id: 'time-19-2023', legId: 'leg-19-2023', runnerId: 'runner-7-2023', actualTime: 180, cumulativeTime: 1800, timestamp: new Date('2023-08-26T11:00:00'), notes: 'Mock completion time' },
        { id: 'time-20-2023', legId: 'leg-20-2023', runnerId: 'runner-8-2023', actualTime: 120, cumulativeTime: 1920, timestamp: new Date('2023-08-26T13:00:00'), notes: 'Mock completion time' },
        { id: 'time-21-2023', legId: 'leg-21-2023', runnerId: 'runner-9-2023', actualTime: 105, cumulativeTime: 2025, timestamp: new Date('2023-08-26T15:00:00'), notes: 'Mock completion time' },
        { id: 'time-22-2023', legId: 'leg-22-2023', runnerId: 'runner-10-2023', actualTime: 135, cumulativeTime: 2160, timestamp: new Date('2023-08-26T17:00:00'), notes: 'Mock completion time' },
        { id: 'time-23-2023', legId: 'leg-23-2023', runnerId: 'runner-11-2023', actualTime: 135, cumulativeTime: 2295, timestamp: new Date('2023-08-26T19:00:00'), notes: 'Mock completion time' },
        { id: 'time-24-2023', legId: 'leg-24-2023', runnerId: 'runner-12-2023', actualTime: 135, cumulativeTime: 2430, timestamp: new Date('2023-08-26T21:00:00'), notes: 'Mock completion time' },
        { id: 'time-25-2023', legId: 'leg-25-2023', runnerId: 'runner-1-2023', actualTime: 270, cumulativeTime: 2700, timestamp: new Date('2023-08-27T00:00:00'), notes: 'Mock completion time' },
        { id: 'time-26-2023', legId: 'leg-26-2023', runnerId: 'runner-2-2023', actualTime: 120, cumulativeTime: 2820, timestamp: new Date('2023-08-27T02:00:00'), notes: 'Mock completion time' },
        { id: 'time-27-2023', legId: 'leg-27-2023', runnerId: 'runner-3-2023', actualTime: 105, cumulativeTime: 2925, timestamp: new Date('2023-08-27T04:00:00'), notes: 'Mock completion time' },
        { id: 'time-28-2023', legId: 'leg-28-2023', runnerId: 'runner-4-2023', actualTime: 135, cumulativeTime: 3060, timestamp: new Date('2023-08-27T06:00:00'), notes: 'Mock completion time' },
        { id: 'time-29-2023', legId: 'leg-29-2023', runnerId: 'runner-5-2023', actualTime: 135, cumulativeTime: 3195, timestamp: new Date('2023-08-27T08:00:00'), notes: 'Mock completion time' },
        { id: 'time-30-2023', legId: 'leg-30-2023', runnerId: 'runner-6-2023', actualTime: 135, cumulativeTime: 3330, timestamp: new Date('2023-08-27T10:00:00'), notes: 'Mock completion time' },
        { id: 'time-31-2023', legId: 'leg-31-2023', runnerId: 'runner-7-2023', actualTime: 210, cumulativeTime: 3540, timestamp: new Date('2023-08-27T12:00:00'), notes: 'Mock completion time' },
        { id: 'time-32-2023', legId: 'leg-32-2023', runnerId: 'runner-8-2023', actualTime: 120, cumulativeTime: 3660, timestamp: new Date('2023-08-27T14:00:00'), notes: 'Mock completion time' },
        { id: 'time-33-2023', legId: 'leg-33-2023', runnerId: 'runner-9-2023', actualTime: 105, cumulativeTime: 3765, timestamp: new Date('2023-08-27T16:00:00'), notes: 'Mock completion time' },
        { id: 'time-34-2023', legId: 'leg-34-2023', runnerId: 'runner-10-2023', actualTime: 135, cumulativeTime: 3900, timestamp: new Date('2023-08-27T18:00:00'), notes: 'Mock completion time' },
        { id: 'time-35-2023', legId: 'leg-35-2023', runnerId: 'runner-11-2023', actualTime: 135, cumulativeTime: 4035, timestamp: new Date('2023-08-27T20:00:00'), notes: 'Mock completion time' },
        { id: 'time-36-2023', legId: 'leg-36-2023', runnerId: 'runner-12-2023', actualTime: 105, cumulativeTime: 4140, timestamp: new Date('2023-08-27T22:00:00'), notes: 'Mock completion time' }
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
      name: 'Team Thunder 2024',
      startTime: new Date('2024-08-23T06:00:00'),
      runners: [
        { id: 'runner-1-2024', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30 },
        { id: 'runner-2-2024', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 },
        { id: 'runner-3-2024', name: 'Emily Rodriguez', email: 'emily@example.com', phone: '555-0103', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45 },
        { id: 'runner-4-2024', name: 'David Kim', email: 'david@example.com', phone: '555-0104', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0 },
        { id: 'runner-5-2024', name: 'Lisa Thompson', email: 'lisa@example.com', phone: '555-0105', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20 },
        { id: 'runner-6-2024', name: 'James Wilson', email: 'james@example.com', phone: '555-0106', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30 },
        { id: 'runner-7-2024', name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0107', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15 },
        { id: 'runner-8-2024', name: 'Rachel Green', email: 'rachel@example.com', phone: '555-0108', estimatedPaceMinutes: 8, estimatedPaceSeconds: 45 },
        { id: 'runner-9-2024', name: 'Chris Taylor', email: 'chris@example.com', phone: '555-0109', estimatedPaceMinutes: 7, estimatedPaceSeconds: 50 },
        { id: 'runner-10-2024', name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0110', estimatedPaceMinutes: 8, estimatedPaceSeconds: 20 },
        { id: 'runner-11-2024', name: 'Ryan Brown', email: 'ryan@example.com', phone: '555-0111', estimatedPaceMinutes: 7, estimatedPaceSeconds: 35 },
        { id: 'runner-12-2024', name: 'Jessica Davis', email: 'jessica@example.com', phone: '555-0112', estimatedPaceMinutes: 8, estimatedPaceSeconds: 10 }
      ],
      legs: [
        // Van 1 - Legs 1-6
        { id: 'leg-1-2024', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-23T06:41:00') },
        { id: 'leg-2-2024', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-23T07:14:00') },
        { id: 'leg-3-2024', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-23T08:04:00') },
        { id: 'leg-4-2024', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-23T08:59:00') },
        { id: 'leg-5-2024', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-23T10:14:00') },
        { id: 'leg-6-2024', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-23T11:29:00') },
        
        // Van 2 - Legs 7-12
        { id: 'leg-7-2024', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2024', isCompleted: true, actualTime: new Date('2024-08-23T13:14:00') },
        { id: 'leg-8-2024', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2024', isCompleted: true, actualTime: new Date('2024-08-23T14:59:00') },
        { id: 'leg-9-2024', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2024', isCompleted: true, actualTime: new Date('2024-08-23T16:44:00') },
        { id: 'leg-10-2024', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2024', isCompleted: true, actualTime: new Date('2024-08-23T18:29:00') },
        { id: 'leg-11-2024', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2024', isCompleted: true, actualTime: new Date('2024-08-23T20:14:00') },
        { id: 'leg-12-2024', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2024', isCompleted: true, actualTime: new Date('2024-08-23T21:59:00') },
        
        // Van 1 - Legs 13-18 (second rotation)
        { id: 'leg-13-2024', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-24T00:14:00') },
        { id: 'leg-14-2024', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-24T01:59:00') },
        { id: 'leg-15-2024', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-24T03:44:00') },
        { id: 'leg-16-2024', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-24T05:29:00') },
        { id: 'leg-17-2024', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-24T07:14:00') },
        { id: 'leg-18-2024', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-24T08:59:00') },
        
        // Van 2 - Legs 19-24 (second rotation)
        { id: 'leg-19-2024', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2024', isCompleted: true, actualTime: new Date('2024-08-24T10:59:00') },
        { id: 'leg-20-2024', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2024', isCompleted: true, actualTime: new Date('2024-08-24T12:59:00') },
        { id: 'leg-21-2024', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2024', isCompleted: true, actualTime: new Date('2024-08-24T14:59:00') },
        { id: 'leg-22-2024', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2024', isCompleted: true, actualTime: new Date('2024-08-24T16:59:00') },
        { id: 'leg-23-2024', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2024', isCompleted: true, actualTime: new Date('2024-08-24T18:59:00') },
        { id: 'leg-24-2024', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2024', isCompleted: true, actualTime: new Date('2024-08-24T20:59:00') },
        
        // Van 1 - Legs 25-30 (third rotation)
        { id: 'leg-25-2024', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2024', isCompleted: true, actualTime: new Date('2024-08-24T23:59:00') },
        { id: 'leg-26-2024', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2024', isCompleted: true, actualTime: new Date('2024-08-25T01:59:00') },
        { id: 'leg-27-2024', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2024', isCompleted: true, actualTime: new Date('2024-08-25T03:59:00') },
        { id: 'leg-28-2024', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2024', isCompleted: true, actualTime: new Date('2024-08-25T05:59:00') },
        { id: 'leg-29-2024', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2024', isCompleted: true, actualTime: new Date('2024-08-25T07:59:00') },
        { id: 'leg-30-2024', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2024', isCompleted: true, actualTime: new Date('2024-08-25T09:59:00') },
        
        // Van 2 - Legs 31-36 (third rotation)
        { id: 'leg-31-2024', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2024', isCompleted: true, actualTime: new Date('2024-08-25T11:59:00') },
        { id: 'leg-32-2024', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2024', isCompleted: true, actualTime: new Date('2024-08-25T13:59:00') },
        { id: 'leg-33-2024', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2024', isCompleted: true, actualTime: new Date('2024-08-25T15:59:00') },
        { id: 'leg-34-2024', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2024', isCompleted: true, actualTime: new Date('2024-08-25T17:59:00') },
        { id: 'leg-35-2024', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2024', isCompleted: true, actualTime: new Date('2024-08-25T19:59:00') },
        { id: 'leg-36-2024', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2024', isCompleted: true, actualTime: new Date('2024-08-25T21:59:00') }
      ],
      times: [
        // Time entries with cumulative times (similar structure to 2023 but with 2024 dates)
        { id: 'time-1-2024', legId: 'leg-1-2024', runnerId: 'runner-1-2024', actualTime: 41, cumulativeTime: 41, timestamp: new Date('2024-08-23T06:41:00'), notes: 'Mock completion time' },
        { id: 'time-2-2024', legId: 'leg-2-2024', runnerId: 'runner-2-2024', actualTime: 33, cumulativeTime: 74, timestamp: new Date('2024-08-23T07:14:00'), notes: 'Mock completion time' },
        { id: 'time-3-2024', legId: 'leg-3-2024', runnerId: 'runner-3-2024', actualTime: 50, cumulativeTime: 124, timestamp: new Date('2024-08-23T08:04:00'), notes: 'Mock completion time' },
        { id: 'time-4-2024', legId: 'leg-4-2024', runnerId: 'runner-4-2024', actualTime: 55, cumulativeTime: 179, timestamp: new Date('2024-08-23T08:59:00'), notes: 'Mock completion time' },
        { id: 'time-5-2024', legId: 'leg-5-2024', runnerId: 'runner-5-2024', actualTime: 75, cumulativeTime: 254, timestamp: new Date('2024-08-23T10:14:00'), notes: 'Mock completion time' },
        { id: 'time-6-2024', legId: 'leg-6-2024', runnerId: 'runner-6-2024', actualTime: 75, cumulativeTime: 329, timestamp: new Date('2024-08-23T11:29:00'), notes: 'Mock completion time' },
        { id: 'time-7-2024', legId: 'leg-7-2024', runnerId: 'runner-7-2024', actualTime: 105, cumulativeTime: 434, timestamp: new Date('2024-08-23T13:14:00'), notes: 'Mock completion time' },
        { id: 'time-8-2024', legId: 'leg-8-2024', runnerId: 'runner-8-2024', actualTime: 105, cumulativeTime: 539, timestamp: new Date('2024-08-23T14:59:00'), notes: 'Mock completion time' },
        { id: 'time-9-2024', legId: 'leg-9-2024', runnerId: 'runner-9-2024', actualTime: 105, cumulativeTime: 644, timestamp: new Date('2024-08-23T16:44:00'), notes: 'Mock completion time' },
        { id: 'time-10-2024', legId: 'leg-10-2024', runnerId: 'runner-10-2024', actualTime: 105, cumulativeTime: 749, timestamp: new Date('2024-08-23T18:29:00'), notes: 'Mock completion time' },
        { id: 'time-11-2024', legId: 'leg-11-2024', runnerId: 'runner-11-2024', actualTime: 105, cumulativeTime: 854, timestamp: new Date('2024-08-23T20:14:00'), notes: 'Mock completion time' },
        { id: 'time-12-2024', legId: 'leg-12-2024', runnerId: 'runner-12-2024', actualTime: 105, cumulativeTime: 959, timestamp: new Date('2024-08-23T21:59:00'), notes: 'Mock completion time' },
        { id: 'time-13-2024', legId: 'leg-13-2024', runnerId: 'runner-1-2024', actualTime: 135, cumulativeTime: 1094, timestamp: new Date('2024-08-24T00:14:00'), notes: 'Mock completion time' },
        { id: 'time-14-2024', legId: 'leg-14-2024', runnerId: 'runner-2-2024', actualTime: 105, cumulativeTime: 1199, timestamp: new Date('2024-08-24T01:59:00'), notes: 'Mock completion time' },
        { id: 'time-15-2024', legId: 'leg-15-2024', runnerId: 'runner-3-2024', actualTime: 105, cumulativeTime: 1304, timestamp: new Date('2024-08-24T03:44:00'), notes: 'Mock completion time' },
        { id: 'time-16-2024', legId: 'leg-16-2024', runnerId: 'runner-4-2024', actualTime: 105, cumulativeTime: 1409, timestamp: new Date('2024-08-24T05:29:00'), notes: 'Mock completion time' },
        { id: 'time-17-2024', legId: 'leg-17-2024', runnerId: 'runner-5-2024', actualTime: 105, cumulativeTime: 1514, timestamp: new Date('2024-08-24T07:14:00'), notes: 'Mock completion time' },
        { id: 'time-18-2024', legId: 'leg-18-2024', runnerId: 'runner-6-2024', actualTime: 105, cumulativeTime: 1619, timestamp: new Date('2024-08-24T08:59:00'), notes: 'Mock completion time' },
        { id: 'time-19-2024', legId: 'leg-19-2024', runnerId: 'runner-7-2024', actualTime: 180, cumulativeTime: 1799, timestamp: new Date('2024-08-24T10:59:00'), notes: 'Mock completion time' },
        { id: 'time-20-2024', legId: 'leg-20-2024', runnerId: 'runner-8-2024', actualTime: 120, cumulativeTime: 1919, timestamp: new Date('2024-08-24T12:59:00'), notes: 'Mock completion time' },
        { id: 'time-21-2024', legId: 'leg-21-2024', runnerId: 'runner-9-2024', actualTime: 105, cumulativeTime: 2024, timestamp: new Date('2024-08-24T14:59:00'), notes: 'Mock completion time' },
        { id: 'time-22-2024', legId: 'leg-22-2024', runnerId: 'runner-10-2024', actualTime: 135, cumulativeTime: 2159, timestamp: new Date('2024-08-24T16:59:00'), notes: 'Mock completion time' },
        { id: 'time-23-2024', legId: 'leg-23-2024', runnerId: 'runner-11-2024', actualTime: 135, cumulativeTime: 2294, timestamp: new Date('2024-08-24T18:59:00'), notes: 'Mock completion time' },
        { id: 'time-24-2024', legId: 'leg-24-2024', runnerId: 'runner-12-2024', actualTime: 135, cumulativeTime: 2429, timestamp: new Date('2024-08-24T20:59:00'), notes: 'Mock completion time' },
        { id: 'time-25-2024', legId: 'leg-25-2024', runnerId: 'runner-1-2024', actualTime: 270, cumulativeTime: 2699, timestamp: new Date('2024-08-24T23:59:00'), notes: 'Mock completion time' },
        { id: 'time-26-2024', legId: 'leg-26-2024', runnerId: 'runner-2-2024', actualTime: 120, cumulativeTime: 2819, timestamp: new Date('2024-08-25T01:59:00'), notes: 'Mock completion time' },
        { id: 'time-27-2024', legId: 'leg-27-2024', runnerId: 'runner-3-2024', actualTime: 105, cumulativeTime: 2924, timestamp: new Date('2024-08-25T03:59:00'), notes: 'Mock completion time' },
        { id: 'time-28-2024', legId: 'leg-28-2024', runnerId: 'runner-4-2024', actualTime: 135, cumulativeTime: 3059, timestamp: new Date('2024-08-25T05:59:00'), notes: 'Mock completion time' },
        { id: 'time-29-2024', legId: 'leg-29-2024', runnerId: 'runner-5-2024', actualTime: 135, cumulativeTime: 3194, timestamp: new Date('2024-08-25T07:59:00'), notes: 'Mock completion time' },
        { id: 'time-30-2024', legId: 'leg-30-2024', runnerId: 'runner-6-2024', actualTime: 135, cumulativeTime: 3329, timestamp: new Date('2024-08-25T09:59:00'), notes: 'Mock completion time' },
        { id: 'time-31-2024', legId: 'leg-31-2024', runnerId: 'runner-7-2024', actualTime: 210, cumulativeTime: 3539, timestamp: new Date('2024-08-25T11:59:00'), notes: 'Mock completion time' },
        { id: 'time-32-2024', legId: 'leg-32-2024', runnerId: 'runner-8-2024', actualTime: 120, cumulativeTime: 3659, timestamp: new Date('2024-08-25T13:59:00'), notes: 'Mock completion time' },
        { id: 'time-33-2024', legId: 'leg-33-2024', runnerId: 'runner-9-2024', actualTime: 105, cumulativeTime: 3764, timestamp: new Date('2024-08-25T15:59:00'), notes: 'Mock completion time' },
        { id: 'time-34-2024', legId: 'leg-34-2024', runnerId: 'runner-10-2024', actualTime: 135, cumulativeTime: 3899, timestamp: new Date('2024-08-25T17:59:00'), notes: 'Mock completion time' },
        { id: 'time-35-2024', legId: 'leg-35-2024', runnerId: 'runner-11-2024', actualTime: 135, cumulativeTime: 4034, timestamp: new Date('2024-08-25T19:59:00'), notes: 'Mock completion time' },
        { id: 'time-36-2024', legId: 'leg-36-2024', runnerId: 'runner-12-2024', actualTime: 105, cumulativeTime: 4139, timestamp: new Date('2024-08-25T21:59:00'), notes: 'Mock completion time' }
      ]
    }
  },
  {
    id: 'htc-2025',
    name: 'Hood to Coast 2025',
    date: new Date('2025-08-08'),
    isActive: true,
    team: {
      id: 'team-htc-2025',
      name: 'Team Thunder 2025',
      startTime: new Date('2025-08-08T06:00:00'),
      runners: [
        { id: 'runner-1-2025', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', estimatedPaceMinutes: 7, estimatedPaceSeconds: 30 },
        { id: 'runner-2-2025', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 },
        { id: 'runner-3-2025', name: 'Emily Rodriguez', email: 'emily@example.com', phone: '555-0103', estimatedPaceMinutes: 7, estimatedPaceSeconds: 45 },
        { id: 'runner-4-2025', name: 'David Kim', email: 'david@example.com', phone: '555-0104', estimatedPaceMinutes: 8, estimatedPaceSeconds: 0 },
        { id: 'runner-5-2025', name: 'Lisa Thompson', email: 'lisa@example.com', phone: '555-0105', estimatedPaceMinutes: 7, estimatedPaceSeconds: 20 },
        { id: 'runner-6-2025', name: 'James Wilson', email: 'james@example.com', phone: '555-0106', estimatedPaceMinutes: 8, estimatedPaceSeconds: 30 },
        { id: 'runner-7-2025', name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0107', estimatedPaceMinutes: 7, estimatedPaceSeconds: 15 },
        { id: 'runner-8-2025', name: 'Rachel Green', email: 'rachel@example.com', phone: '555-0108', estimatedPaceMinutes: 8, estimatedPaceSeconds: 45 },
        { id: 'runner-9-2025', name: 'Chris Taylor', email: 'chris@example.com', phone: '555-0109', estimatedPaceMinutes: 7, estimatedPaceSeconds: 50 },
        { id: 'runner-10-2025', name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0110', estimatedPaceMinutes: 8, estimatedPaceSeconds: 20 },
        { id: 'runner-11-2025', name: 'Ryan Brown', email: 'ryan@example.com', phone: '555-0111', estimatedPaceMinutes: 7, estimatedPaceSeconds: 35 },
        { id: 'runner-12-2025', name: 'Jessica Davis', email: 'jessica@example.com', phone: '555-0112', estimatedPaceMinutes: 8, estimatedPaceSeconds: 10 }
      ],
      legs: [
        // Van 1 - Legs 1-6
        { id: 'leg-1-2025', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2025', isCompleted: false },
        { id: 'leg-2-2025', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2025', isCompleted: false },
        { id: 'leg-3-2025', order: 3, description: 'Rhododendron to Zigzag', distance: 3.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2025', isCompleted: false },
        { id: 'leg-4-2025', order: 4, description: 'Zigzag to Sandy', distance: 4.5, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2025', isCompleted: false },
        { id: 'leg-5-2025', order: 5, description: 'Sandy to Gresham', distance: 5.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2025', isCompleted: false },
        { id: 'leg-6-2025', order: 6, description: 'Gresham to Portland', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2025', isCompleted: false },
        
        // Van 2 - Legs 7-12
        { id: 'leg-7-2025', order: 7, description: 'Portland to St. Helens', distance: 6.1, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2025', isCompleted: false },
        { id: 'leg-8-2025', order: 8, description: 'St. Helens to Scappoose', distance: 5.8, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2025', isCompleted: false },
        { id: 'leg-9-2025', order: 9, description: 'Scappoose to Mist', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2025', isCompleted: false },
        { id: 'leg-10-2025', order: 10, description: 'Mist to Jewell', distance: 5.3, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2025', isCompleted: false },
        { id: 'leg-11-2025', order: 11, description: 'Jewell to Olney', distance: 4.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2025', isCompleted: false },
        { id: 'leg-12-2025', order: 12, description: 'Olney to Seaside', distance: 5.0, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2025', isCompleted: false },
        
        // Van 1 - Legs 13-18 (second rotation)
        { id: 'leg-13-2025', order: 13, description: 'Seaside to Cannon Beach', distance: 4.3, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2025', isCompleted: false },
        { id: 'leg-14-2025', order: 14, description: 'Cannon Beach to Manzanita', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2025', isCompleted: false },
        { id: 'leg-15-2025', order: 15, description: 'Manzanita to Nehalem', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2025', isCompleted: false },
        { id: 'leg-16-2025', order: 16, description: 'Nehalem to Wheeler', distance: 5.1, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2025', isCompleted: false },
        { id: 'leg-17-2025', order: 17, description: 'Wheeler to Rockaway Beach', distance: 4.6, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2025', isCompleted: false },
        { id: 'leg-18-2025', order: 18, description: 'Rockaway Beach to Tillamook', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2025', isCompleted: false },
        
        // Van 2 - Legs 19-24 (second rotation)
        { id: 'leg-19-2025', order: 19, description: 'Tillamook to Pacific City', distance: 6.2, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2025', isCompleted: false },
        { id: 'leg-20-2025', order: 20, description: 'Pacific City to Lincoln City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2025', isCompleted: false },
        { id: 'leg-21-2025', order: 21, description: 'Lincoln City to Depoe Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2025', isCompleted: false },
        { id: 'leg-22-2025', order: 22, description: 'Depoe Bay to Newport', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2025', isCompleted: false },
        { id: 'leg-23-2025', order: 23, description: 'Newport to Waldport', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2025', isCompleted: false },
        { id: 'leg-24-2025', order: 24, description: 'Waldport to Yachats', distance: 5.5, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2025', isCompleted: false },
        
        // Van 1 - Legs 25-30 (third rotation)
        { id: 'leg-25-2025', order: 25, description: 'Yachats to Florence', distance: 6.0, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2025', isCompleted: false },
        { id: 'leg-26-2025', order: 26, description: 'Florence to Reedsport', distance: 5.8, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2025', isCompleted: false },
        { id: 'leg-27-2025', order: 27, description: 'Reedsport to Coos Bay', distance: 4.9, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-3-2025', isCompleted: false },
        { id: 'leg-28-2025', order: 28, description: 'Coos Bay to Bandon', distance: 5.6, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-4-2025', isCompleted: false },
        { id: 'leg-29-2025', order: 29, description: 'Bandon to Port Orford', distance: 4.8, difficulty: 'Easy', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-5-2025', isCompleted: false },
        { id: 'leg-30-2025', order: 30, description: 'Port Orford to Gold Beach', distance: 5.4, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-6-2025', isCompleted: false },
        
        // Van 2 - Legs 31-36 (third rotation)
        { id: 'leg-31-2025', order: 31, description: 'Gold Beach to Brookings', distance: 6.1, difficulty: 'Hard', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-7-2025', isCompleted: false },
        { id: 'leg-32-2025', order: 32, description: 'Brookings to Crescent City', distance: 5.7, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-8-2025', isCompleted: false },
        { id: 'leg-33-2025', order: 33, description: 'Crescent City to Klamath', distance: 4.9, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 45, runnerId: 'runner-9-2025', isCompleted: false },
        { id: 'leg-34-2025', order: 34, description: 'Klamath to Trinidad', distance: 5.3, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 0, runnerId: 'runner-10-2025', isCompleted: false },
        { id: 'leg-35-2025', order: 35, description: 'Trinidad to Arcata', distance: 4.7, difficulty: 'Easy', vanNumber: 2, estimatedPaceMinutes: 7, estimatedPaceSeconds: 20, runnerId: 'runner-11-2025', isCompleted: false },
        { id: 'leg-36-2025', order: 36, description: 'Arcata to Eureka', distance: 5.0, difficulty: 'Medium', vanNumber: 2, estimatedPaceMinutes: 8, estimatedPaceSeconds: 30, runnerId: 'runner-12-2025', isCompleted: false }
      ],
      times: [] // No completed times for upcoming race
    }
  }
];
