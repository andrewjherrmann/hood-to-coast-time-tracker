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
  completed: boolean;
  actualTime?: number;
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

  // Mock data
  const mockRaces: Race[] = [
    {
      id: 'race-1',
      name: 'Hood to Coast 2024',
      date: new Date('2024-08-24'),
      isActive: true,
      team: {
        id: 'mock-team-1',
        name: 'Mock Team Alpha',
        startTime: new Date('2024-08-24T06:00:00'),
        runners: [
          {
            id: 'runner-1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-0101',
            estimatedPaceMinutes: 8,
            estimatedPaceSeconds: 30
          },
          {
            id: 'runner-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '555-0102',
            estimatedPaceMinutes: 9,
            estimatedPaceSeconds: 15
          },
          {
            id: 'runner-3',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '555-0103',
            estimatedPaceMinutes: 7,
            estimatedPaceSeconds: 45
          }
        ],
        legs: [
          {
            id: 'leg-1',
            description: 'Start to Exchange 1 - Flat terrain through downtown',
            distance: 5.2,
            difficulty: 'Easy',
            estimatedPaceMinutes: 8,
            estimatedPaceSeconds: 30,
            order: 1,
            completed: false,
            runnerId: 'runner-1'
          },
          {
            id: 'leg-2',
            description: 'Exchange 1 to Exchange 2 - Rolling hills on country roads',
            distance: 6.8,
            difficulty: 'Medium',
            estimatedPaceMinutes: 9,
            estimatedPaceSeconds: 15,
            order: 2,
            completed: false,
            runnerId: 'runner-2'
          },
          {
            id: 'leg-3',
            description: 'Exchange 2 to Exchange 3 - Mountain trail section',
            distance: 4.5,
            difficulty: 'Hard',
            estimatedPaceMinutes: 10,
            estimatedPaceSeconds: 0,
            order: 3,
            completed: false,
            runnerId: 'runner-3'
          }
        ],
        times: []
      }
    }
  ];

  // Initialize with mock data
  if (races.value.length === 0) {
    races.value = [...mockRaces];
    currentRaceId.value = mockRaces[0]?.id || null;
  }

  // Computed
  const totalDistance = computed(() => {
    if (!currentTeam.value) return 0;
    return currentTeam.value.legs.reduce((total, leg) => total + leg.distance, 0);
  });

  const completedLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => leg.completed);
  });

  const remainingLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => !leg.completed);
  });

  const currentLeg = computed(() => {
    if (!currentTeam.value) return null;
    return currentTeam.value.legs.find(leg => !leg.completed);
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
      leg.completed = true;
      leg.actualTime = actualTime;
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

  function updateLeg(id: string, updates: Partial<Omit<Leg, 'id' | 'order' | 'completed'>>) {
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

  function addLeg(leg: Omit<Leg, 'id' | 'order' | 'completed'>) {
    if (!currentTeam.value) return;
    
    const newLeg: Leg = {
      ...leg,
      id: `leg-${Date.now()}`,
      order: currentTeam.value.legs.length + 1,
      completed: false
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
      leg.completed = true;
      leg.actualTime = time.actualTime;
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
      if (leg && leg.completed) {
        leg.completed = false;
        delete leg.actualTime;
        delete leg.runnerId;
      }
    }
  }

  function clearAllData() {
    if (!currentTeam.value) return;
    
    currentTeam.value.legs.forEach(leg => {
      leg.completed = false;
      delete leg.actualTime;
      delete leg.runnerId;
    });
    
    currentTeam.value.times = [];
  }

  function toggleMockMode() {
    isMockMode.value = !isMockMode.value;
    if (isMockMode.value) {
      // currentTeam is now computed, so we don't need to set it
      isAuthenticated.value = true;
      currentUser.value = { id: 'user-1', email: 'admin@example.com', name: 'Admin User' };
    } else {
      // currentTeam is now computed, so we don't need to set it
      isAuthenticated.value = false;
      currentUser.value = null;
    }
  }

  function signIn(email: string, password: string) {
    // Mock authentication
    if (email === 'admin@example.com' && password === 'password') {
      isAuthenticated.value = true;
      currentUser.value = { id: 'user-1', email, name: 'Admin User' };
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
          completed: false
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
    const index = races.value.findIndex(r => r.id === raceId);
    if (index !== -1) {
      races.value.splice(index, 1);
      
      // If we deleted the current race, switch to another one
      if (currentRaceId.value === raceId) {
        currentRaceId.value = races.value.length > 0 ? races.value[0]?.id || null : null;
      }
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
    
    // Helper functions
    calculateEstimatedTime,
    getLegEstimatedTime,
    
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
    setActiveRace
  };
});
