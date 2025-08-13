import type { Race } from '../types';

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
        { id: 'runner-2-2023', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 }
      ],
      legs: [
        { id: 'leg-1-2023', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2023', timeEntry: { timestamp: new Date('2023-08-25T06:42:00'), notes: 'Mock completion time' } },
        { id: 'leg-2-2023', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2023', timeEntry: { timestamp: new Date('2023-08-25T07:15:00'), notes: 'Mock completion time' } }
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
        { id: 'runner-2-2025', name: 'Mike Chen', email: 'mike@example.com', phone: '555-0102', estimatedPaceMinutes: 8, estimatedPaceSeconds: 15 }
      ],
      legs: [
        { id: 'leg-1-2025', order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1, estimatedPaceMinutes: 7, estimatedPaceSeconds: 30, runnerId: 'runner-1-2025' },
        { id: 'leg-2-2025', order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1, estimatedPaceMinutes: 8, estimatedPaceSeconds: 15, runnerId: 'runner-2-2025' }
      ]
    }
  }
];
