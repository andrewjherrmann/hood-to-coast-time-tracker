import type { Race } from '../types';

// Core runner pool - these are the runners that will appear across different years
const coreRunners = [
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', phone: '555-1000' },
  { name: 'Mike Chen', email: 'mike.chen@example.com', phone: '555-1001' },
  { name: 'Emily Rodriguez', email: 'emily.rodriguez@example.com', phone: '555-1002' },
  { name: 'David Kim', email: 'david.kim@example.com', phone: '555-1003' },
  { name: 'Lisa Thompson', email: 'lisa.thompson@example.com', phone: '555-1004' },
  { name: 'James Wilson', email: 'james.wilson@example.com', phone: '555-1005' },
  { name: 'Maria Garcia', email: 'maria.garcia@example.com', phone: '555-1006' },
  { name: 'Alex Turner', email: 'alex.turner@example.com', phone: '555-1007' },
  { name: 'Rachel Green', email: 'rachel.green@example.com', phone: '555-1008' },
  { name: 'Chris Martinez', email: 'chris.martinez@example.com', phone: '555-1009' },
  { name: 'Amanda Lee', email: 'amanda.lee@example.com', phone: '555-1010' },
  { name: 'Kevin Park', email: 'kevin.park@example.com', phone: '555-1011' },
  { name: 'Jennifer Adams', email: 'jennifer.adams@example.com', phone: '555-1012' },
  { name: 'Robert Brown', email: 'robert.brown@example.com', phone: '555-1013' },
  { name: 'Jessica Davis', email: 'jessica.davis@example.com', phone: '555-1014' },
  { name: 'Michael Miller', email: 'michael.miller@example.com', phone: '555-1015' },
  { name: 'Ashley Taylor', email: 'ashley.taylor@example.com', phone: '555-1016' },
  { name: 'Daniel Anderson', email: 'daniel.anderson@example.com', phone: '555-1017' },
  { name: 'Stephanie White', email: 'stephanie.white@example.com', phone: '555-1018' },
  { name: 'Christopher Clark', email: 'christopher.clark@example.com', phone: '555-1019' },
  { name: 'Nicole Lewis', email: 'nicole.lewis@example.com', phone: '555-1020' },
  { name: 'Matthew Hall', email: 'matthew.hall@example.com', phone: '555-1021' }
];

// Pace variations - runners can get faster/slower over time
const paceVariations = [
  { minutes: 7, seconds: 30 }, { minutes: 7, seconds: 45 },
  { minutes: 8, seconds: 0 }, { minutes: 8, seconds: 15 },
  { minutes: 8, seconds: 30 }, { minutes: 8, seconds: 45 },
  { minutes: 9, seconds: 0 }, { minutes: 9, seconds: 30 },
  { minutes: 10, seconds: 0 }, { minutes: 10, seconds: 30 },
  { minutes: 11, seconds: 0 }, { minutes: 11, seconds: 30 }
];

// Helper function to create runners for a specific year with continuity
function createRunnersForYear(raceId: string, baseId: number, year: number, previousRunners?: Array<{ id: string, name: string }>) {
  // Determine how many runners return from previous year (6-9)
  const returningCount = Math.floor(Math.random() * 4) + 6; // 6-9 runners
  
  const selectedRunners: Array<{ id: string, name: string, email: string, phone: string, estimatedPaceMinutes: number, estimatedPaceSeconds: number }> = [];
  
  if (previousRunners && previousRunners.length > 0) {
    // Select returning runners (6-9)
    const shuffled = [...previousRunners].sort(() => Math.random() - 0.5);
    const returning = shuffled.slice(0, returningCount);
    
    // Add returning runners with potential pace changes
    returning.forEach((runner, index) => {
      const paceIndex = Math.floor(Math.random() * paceVariations.length);
      const pace = paceVariations[paceIndex]!;
      
      selectedRunners.push({
        id: `runner-${baseId + index}-${raceId}`,
        name: runner.name,
        email: runner.name.toLowerCase().replace(' ', '.') + '@example.com',
        phone: `555-${1000 + baseId + index}`,
        estimatedPaceMinutes: pace.minutes,
        estimatedPaceSeconds: pace.seconds
      });
    });
  }
  
  // Fill remaining slots with new runners from core pool
  const remainingSlots = 12 - selectedRunners.length;
  const availableNewRunners = coreRunners.filter(runner => 
    !selectedRunners.some(selected => selected.name === runner.name)
  );
  
  // Shuffle and select new runners
  const shuffledNew = [...availableNewRunners].sort(() => Math.random() - 0.5);
  const newRunners = shuffledNew.slice(0, remainingSlots);
  
  newRunners.forEach((runner, index) => {
    const paceIndex = Math.floor(Math.random() * paceVariations.length);
    const pace = paceVariations[paceIndex]!;
    
    selectedRunners.push({
      id: `runner-${baseId + selectedRunners.length + index}-${raceId}`,
      name: runner.name,
      email: runner.email,
      phone: runner.phone,
      estimatedPaceMinutes: pace.minutes,
      estimatedPaceSeconds: pace.seconds
    });
  });
  
  return selectedRunners;
}

// Helper function to create legs with position-consistent runner assignments
function createLegsWithPositionConsistency(raceId: string, baseId: number, runners: Array<{ id: string, name: string }>) {
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
  
  // Create position-consistent runner assignments
  // Position 1: Legs 1, 13, 25 (Van 1, first runner)
  // Position 2: Legs 2, 14, 26 (Van 1, second runner)
  // Position 3: Legs 3, 15, 27 (Van 1, third runner)
  // Position 4: Legs 4, 16, 28 (Van 1, fourth runner)
  // Position 5: Legs 5, 17, 29 (Van 1, fifth runner)
  // Position 6: Legs 6, 18, 30 (Van 1, sixth runner)
  // Position 7: Legs 7, 19, 31 (Van 2, first runner)
  // Position 8: Legs 8, 20, 32 (Van 2, second runner)
  // Position 9: Legs 9, 21, 33 (Van 2, third runner)
  // Position 10: Legs 10, 22, 34 (Van 2, fourth runner)
  // Position 11: Legs 11, 23, 35 (Van 2, fifth runner)
  // Position 12: Legs 12, 24, 36 (Van 2, sixth runner)
  
  return legData.map((leg, index) => {
    const position = (leg.order - 1) % 12; // 0-11 for position
    const runner = runners[position];
    
    if (!runner) {
      throw new Error(`No runner found for position ${position} in race ${raceId}`);
    }
    
    return {
      id: `leg-${baseId + index}-${raceId}`,
      order: leg.order,
      description: leg.description,
      distance: leg.distance,
      difficulty: leg.difficulty,
      vanNumber: leg.vanNumber,
      estimatedPaceMinutes: 8, // Default leg pace
      estimatedPaceSeconds: 30,
      runnerId: runner.id
    };
  });
}

// Mock data for development with realistic runner continuity
export const mockRaces: Race[] = [
  {
    id: 'htc-2023',
    name: 'Hood to Coast 2023',
    date: new Date('2023-08-25'),
    isActive: false,
    team: (() => {
      const runners = createRunnersForYear('htc-2023', 1, 2023);
      return {
        id: 'team-htc-2023',
        name: 'Team Thunder 2023',
        startTime: new Date('2023-08-25T06:00:00'),
        runners,
        legs: createLegsWithPositionConsistency('htc-2023', 1, runners).map((leg, index) => {
          const baseLeg = { ...leg };
          return {
            ...baseLeg,
            timeEntry: {
              timestamp: new Date(new Date('2023-08-25T06:00:00').getTime() + (index + 1) * 45 * 60 * 1000),
              notes: 'Completed in 2023'
            }
          };
        })
      };
    })()
  },
  {
    id: 'htc-2024',
    name: 'Hood to Coast 2024',
    date: new Date('2024-08-23'),
    isActive: false,
    team: (() => {
      const runners2023 = createRunnersForYear('htc-2023', 1, 2023);
      const runners = createRunnersForYear('htc-2024', 13, 2024, runners2023);
      return {
        id: 'team-htc-2024',
        name: 'Team Thunder 2024',
        startTime: new Date('2024-08-23T06:00:00'),
        runners,
        legs: createLegsWithPositionConsistency('htc-2024', 13, runners).map((leg, index) => {
          const baseLeg = { ...leg };
          return {
            ...baseLeg,
            timeEntry: {
              timestamp: new Date(new Date('2024-08-23T06:00:00').getTime() + (index + 1) * 42 * 60 * 1000),
              notes: 'Completed in 2024'
            }
          };
        })
      };
    })()
  },
  {
    id: 'htc-2025',
    name: 'Hood to Coast 2025',
    date: new Date('2025-08-23'),
    isActive: false,
    team: (() => {
      const runners2023 = createRunnersForYear('htc-2023', 1, 2023);
      const runners2024 = createRunnersForYear('htc-2024', 13, 2024, runners2023);
      const runners = createRunnersForYear('htc-2025', 25, 2025, runners2024);
      return {
        id: 'team-htc-2025',
        name: 'Team Thunder 2025',
        startTime: new Date('2025-08-23T06:00:00'),
        runners,
        legs: createLegsWithPositionConsistency('htc-2025', 25, runners).map((leg, index) => {
          const baseLeg = { ...leg };
          return {
            ...baseLeg,
            timeEntry: {
              timestamp: new Date(new Date('2025-08-23T06:00:00').getTime() + (index + 1) * 40 * 60 * 1000),
              notes: 'Completed in 2025'
            }
          };
        })
      };
    })()
  },
  {
    id: 'htc-2026',
    name: 'Hood to Coast 2026',
    date: new Date('2026-08-21'),
    isActive: true,
    team: (() => {
      const runners2023 = createRunnersForYear('htc-2023', 1, 2023);
      const runners2024 = createRunnersForYear('htc-2024', 13, 2024, runners2023);
      const runners2025 = createRunnersForYear('htc-2025', 25, 2025, runners2024);
      const runners = createRunnersForYear('htc-2026', 37, 2026, runners2025);
      return {
        id: 'team-htc-2026',
        name: 'Team Thunder 2026',
        startTime: new Date('2026-08-21T06:00:00'),
        runners,
        legs: createLegsWithPositionConsistency('htc-2026', 37, runners)
      };
    })()
  }
];
