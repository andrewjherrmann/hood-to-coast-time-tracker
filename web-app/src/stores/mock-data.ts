import type { Race } from '../types';

// Helper function to create runners with realistic paces
function createRunners(raceId: string, baseId: number) {
  const names = [
    'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim',
    'Lisa Thompson', 'James Wilson', 'Maria Garcia', 'Alex Turner',
    'Rachel Green', 'Chris Martinez', 'Amanda Lee', 'Kevin Park'
  ];
  
  const paces = [
    { minutes: 7, seconds: 30 }, { minutes: 7, seconds: 45 },
    { minutes: 8, seconds: 0 }, { minutes: 8, seconds: 15 },
    { minutes: 8, seconds: 30 }, { minutes: 8, seconds: 45 },
    { minutes: 9, seconds: 0 }, { minutes: 9, seconds: 30 },
    { minutes: 10, seconds: 0 }, { minutes: 10, seconds: 30 },
    { minutes: 11, seconds: 0 }, { minutes: 11, seconds: 30 }
  ];
  
  return names.map((name, index) => ({
    id: `runner-${baseId + index}-${raceId}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    phone: `555-${(1000 + index).toString().padStart(4, '0')}`,
    estimatedPaceMinutes: paces[index]!.minutes,
    estimatedPaceSeconds: paces[index]!.seconds
  }));
}

// Helper function to create legs based on 2025 HTC Handbook
function createLegs(raceId: string, baseId: number) {
  // Based on 2025 HTC Handbook pages 37-83
  const legData: Array<{
    order: number;
    description: string;
    distance: number;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
    vanNumber: number;
  }> = [
    // VAN 1 - Legs 1-6, 13-18, 25-30
    { order: 1, description: 'Timberline Lodge to Government Camp', distance: 5.7, difficulty: 'Hard', vanNumber: 1 },
    { order: 2, description: 'Government Camp to Rhododendron', distance: 4.2, difficulty: 'Medium', vanNumber: 1 },
    { order: 3, description: 'Rhododendron to Welches', distance: 3.8, difficulty: 'Easy', vanNumber: 1 },
    { order: 4, description: 'Welches to Sandy', distance: 4.8, difficulty: 'Medium', vanNumber: 1 },
    { order: 5, description: 'Sandy to Gresham', distance: 5.1, difficulty: 'Medium', vanNumber: 1 },
    { order: 6, description: 'Gresham to Portland', distance: 4.9, difficulty: 'Medium', vanNumber: 1 },
    
    // VAN 2 - Legs 7-12, 19-24, 31-36
    { order: 7, description: 'Portland to St. Johns', distance: 3.6, difficulty: 'Easy', vanNumber: 2 },
    { order: 8, description: 'St. Johns to Scappoose', distance: 4.1, difficulty: 'Medium', vanNumber: 2 },
    { order: 9, description: 'Scappoose to St. Helens', distance: 5.3, difficulty: 'Hard', vanNumber: 2 },
    { order: 10, description: 'St. Helens to Mist', distance: 4.7, difficulty: 'Medium', vanNumber: 2 },
    { order: 11, description: 'Mist to Jewell', distance: 5.8, difficulty: 'Hard', vanNumber: 2 },
    { order: 12, description: 'Jewell to Olney', distance: 4.4, difficulty: 'Medium', vanNumber: 2 },
    
    // VAN 1 - Second rotation (Legs 13-18)
    { order: 13, description: 'Olney to Seaside Junction', distance: 4.9, difficulty: 'Medium', vanNumber: 1 },
    { order: 14, description: 'Seaside Junction to Gearhart', distance: 3.8, difficulty: 'Easy', vanNumber: 1 },
    { order: 15, description: 'Gearhart to Warrenton', distance: 4.2, difficulty: 'Medium', vanNumber: 1 },
    { order: 16, description: 'Warrenton to Hammond', distance: 5.1, difficulty: 'Hard', vanNumber: 1 },
    { order: 17, description: 'Hammond to Astoria', distance: 4.6, difficulty: 'Medium', vanNumber: 1 },
    { order: 18, description: 'Astoria to Westport', distance: 3.9, difficulty: 'Easy', vanNumber: 1 },
    
    // VAN 2 - Second rotation (Legs 19-24)
    { order: 19, description: 'Westport to Knappa', distance: 4.3, difficulty: 'Medium', vanNumber: 2 },
    { order: 20, description: 'Knappa to Clatskanie', distance: 5.2, difficulty: 'Hard', vanNumber: 2 },
    { order: 21, description: 'Clatskanie to Rainier', distance: 4.8, difficulty: 'Medium', vanNumber: 2 },
    { order: 22, description: 'Rainier to Longview', distance: 3.7, difficulty: 'Easy', vanNumber: 2 },
    { order: 23, description: 'Longview to Kelso', distance: 4.5, difficulty: 'Medium', vanNumber: 2 },
    { order: 24, description: 'Kelso to Castle Rock', distance: 5.0, difficulty: 'Hard', vanNumber: 2 },
    
    // VAN 1 - Third rotation (Legs 25-30)
    { order: 25, description: 'Castle Rock to Toutle', distance: 4.1, difficulty: 'Medium', vanNumber: 1 },
    { order: 26, description: 'Toutle to Silver Lake', distance: 5.4, difficulty: 'Hard', vanNumber: 1 },
    { order: 27, description: 'Silver Lake to Toledo', distance: 3.9, difficulty: 'Easy', vanNumber: 1 },
    { order: 28, description: 'Toledo to Winlock', distance: 4.7, difficulty: 'Medium', vanNumber: 1 },
    { order: 29, description: 'Winlock to Centralia', distance: 5.2, difficulty: 'Hard', vanNumber: 1 },
    { order: 30, description: 'Centralia to Chehalis', distance: 4.3, difficulty: 'Medium', vanNumber: 1 },
    
    // VAN 2 - Third rotation (Legs 31-36)
    { order: 31, description: 'Chehalis to Bucoda', distance: 4.8, difficulty: 'Medium', vanNumber: 2 },
    { order: 32, description: 'Bucoda to Tenino', distance: 3.6, difficulty: 'Easy', vanNumber: 2 },
    { order: 33, description: 'Tenino to Olympia', distance: 5.1, difficulty: 'Hard', vanNumber: 2 },
    { order: 34, description: 'Olympia to Lacey', distance: 4.4, difficulty: 'Medium', vanNumber: 2 },
    { order: 35, description: 'Lacey to Tumwater', distance: 4.9, difficulty: 'Medium', vanNumber: 2 },
    { order: 36, description: 'Tumwater to Pacific Beach', distance: 5.3, difficulty: 'Hard', vanNumber: 2 }
  ];
  
  return legData.map((leg, index) => ({
    id: `leg-${baseId + index}-${raceId}`,
    order: leg.order,
    description: leg.description,
    distance: leg.distance,
    difficulty: leg.difficulty,
    vanNumber: leg.vanNumber,
    estimatedPaceMinutes: 8, // Default leg pace
    estimatedPaceSeconds: 30,
    runnerId: `runner-${(index % 12) + 1}-${raceId}` // Assign runners in rotation
  }));
}

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
      runners: createRunners('htc-2023', 1),
      legs: createLegs('htc-2023', 1).map((leg, index) => {
        const baseLeg = { ...leg };
        return {
          ...baseLeg,
          timeEntry: {
            timestamp: new Date(new Date('2023-08-25T06:00:00').getTime() + (index + 1) * 45 * 60 * 1000),
            notes: 'Completed in 2023'
          }
        };
      })
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
      runners: createRunners('htc-2024', 13),
      legs: createLegs('htc-2024', 25).map((leg, index) => {
        const baseLeg = { ...leg };
        return {
          ...baseLeg,
          timeEntry: {
            timestamp: new Date(new Date('2024-08-23T06:00:00').getTime() + (index + 1) * 42 * 60 * 1000),
            notes: 'Completed in 2024'
          }
        };
      })
    }
  },
  {
    id: 'htc-2025',
    name: 'Hood to Coast 2025',
    date: new Date('2025-08-23'),
    isActive: false,
    team: {
      id: 'team-htc-2025',
      name: 'Team Thunder 2025',
      startTime: new Date('2025-08-23T06:00:00'),
      runners: createRunners('htc-2025', 25),
      legs: createLegs('htc-2025', 49).map((leg, index) => {
        const baseLeg = { ...leg };
        return {
          ...baseLeg,
          timeEntry: {
            timestamp: new Date(new Date('2025-08-23T06:00:00').getTime() + (index + 1) * 40 * 60 * 1000),
            notes: 'Completed in 2025'
          }
        };
      })
    }
  },
  {
    id: 'htc-2026',
    name: 'Hood to Coast 2026',
    date: new Date('2026-08-21'),
    isActive: true,
    team: {
      id: 'team-htc-2026',
      name: 'Team Thunder 2026',
      startTime: new Date('2026-08-21T06:00:00'),
      runners: createRunners('htc-2026', 37),
      legs: createLegs('htc-2026', 73) // No completed legs for upcoming race
    }
  }
];
