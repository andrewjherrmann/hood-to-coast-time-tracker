import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Leg {
  id: string;
  name: string;
  distance: number; // in miles
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  estimatedTime: number; // in minutes
  actualTime?: number; // in minutes
  runner?: string;
  completed: boolean;
  order: number;
}

export interface TimeEntry {
  id: string;
  legId: string;
  runner: string;
  actualTime: number; // in minutes
  timestamp: Date;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  startTime: Date;
  legs: Leg[];
  times: TimeEntry[];
}

export const useHoodToCoastStore = defineStore('hoodToCoast', () => {
  // State
  const currentTeam = ref<Team | null>(null);
  const isMockMode = ref(true);
  const isLoading = ref(false);

  // Mock data
  const mockTeam: Team = {
    id: 'mock-team-1',
    name: 'Mock Team',
    startTime: new Date('2024-08-23T06:00:00'),
    legs: [
      {
        id: 'leg-1',
        name: 'Leg 1 - Start to Exchange 1',
        distance: 5.8,
        difficulty: 'Easy',
        estimatedTime: 45,
        completed: false,
        order: 1
      },
      {
        id: 'leg-2',
        name: 'Leg 2 - Exchange 1 to Exchange 2',
        distance: 6.2,
        difficulty: 'Medium',
        estimatedTime: 52,
        completed: false,
        order: 2
      },
      {
        id: 'leg-3',
        name: 'Leg 3 - Exchange 2 to Exchange 3',
        distance: 4.1,
        difficulty: 'Hard',
        estimatedTime: 38,
        completed: false,
        order: 3
      },
      {
        id: 'leg-4',
        name: 'Leg 4 - Exchange 3 to Exchange 4',
        distance: 7.5,
        difficulty: 'Very Hard',
        estimatedTime: 65,
        completed: false,
        order: 4
      },
      {
        id: 'leg-5',
        name: 'Leg 5 - Exchange 4 to Exchange 5',
        distance: 5.3,
        difficulty: 'Medium',
        estimatedTime: 48,
        completed: false,
        order: 5
      },
      {
        id: 'leg-6',
        name: 'Leg 6 - Exchange 5 to Exchange 6',
        distance: 6.8,
        difficulty: 'Hard',
        estimatedTime: 58,
        completed: false,
        order: 6
      }
    ],
    times: []
  };

  // Initialize with mock data
  if (!currentTeam.value) {
    currentTeam.value = mockTeam;
  }

  // Getters
  const totalDistance = computed(() => {
    if (!currentTeam.value) return 0;
    return currentTeam.value.legs.reduce((sum, leg) => sum + leg.distance, 0);
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
    return currentTeam.value.legs.find(leg => !leg.completed) || null;
  });

  const estimatedFinishTime = computed(() => {
    if (!currentTeam.value) return null;
    
    const startTime = new Date(currentTeam.value.startTime);
    let totalTime = 0;
    
    // Add completed legs
    currentTeam.value.times.forEach(time => {
      totalTime += time.actualTime;
    });
    
    // Add estimated time for remaining legs
    remainingLegs.value.forEach(leg => {
      totalTime += leg.estimatedTime;
    });
    
    const finishTime = new Date(startTime.getTime() + totalTime * 60000);
    return finishTime;
  });

  const progressPercentage = computed(() => {
    if (!currentTeam.value) return 0;
    const completed = completedLegs.value.length;
    const total = currentTeam.value.legs.length;
    return total > 0 ? (completed / total) * 100 : 0;
  });

  // Actions
  function completeLeg(legId: string, actualTime: number, runner: string) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      leg.completed = true;
      leg.actualTime = actualTime;
      leg.runner = runner;
      
      // Add time entry
      const timeEntry: TimeEntry = {
        id: `time-${Date.now()}`,
        legId,
        runner,
        actualTime,
        timestamp: new Date(),
        notes: `Completed ${leg.name}`
      };
      
      currentTeam.value.times.push(timeEntry);
    }
  }

  function updateLeg(legId: string, updates: Partial<Leg>) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      Object.assign(leg, updates);
    }
  }

  function deleteLeg(legId: string) {
    if (!currentTeam.value) return;
    
    const legIndex = currentTeam.value.legs.findIndex(l => l.id === legId);
    if (legIndex !== -1) {
      currentTeam.value.legs.splice(legIndex, 1);
      
      // Remove associated times
      currentTeam.value.times = currentTeam.value.times.filter(t => t.legId !== legId);
      
      // Reorder remaining legs
      currentTeam.value.legs.forEach((leg, index) => {
        leg.order = index + 1;
      });
    }
  }

  function deleteTime(timeId: string) {
    if (!currentTeam.value) return;
    
    const timeIndex = currentTeam.value.times.findIndex(t => t.id === timeId);
    if (timeIndex !== -1) {
      const time = currentTeam.value.times[timeIndex];
      
      // Mark leg as incomplete if this was the completion time
      if (time) {
        const leg = currentTeam.value.legs.find(l => l.id === time.legId);
        if (leg && leg.completed) {
          leg.completed = false;
          delete leg.actualTime;
          delete leg.runner;
        }
      }
      
      currentTeam.value.times.splice(timeIndex, 1);
    }
  }

  function clearAllData() {
    if (!currentTeam.value) return;
    
    currentTeam.value.legs.forEach(leg => {
      leg.completed = false;
      delete leg.actualTime;
      delete leg.runner;
    });
    
    currentTeam.value.times = [];
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
  }

  function toggleMockMode() {
    isMockMode.value = !isMockMode.value;
  }

  return {
    // State
    currentTeam,
    isMockMode,
    isLoading,
    
    // Getters
    totalDistance,
    completedLegs,
    remainingLegs,
    currentLeg,
    estimatedFinishTime,
    progressPercentage,
    
    // Actions
    completeLeg,
    updateLeg,
    deleteLeg,
    deleteTime,
    clearAllData,
    addLeg,
    addTime,
    toggleMockMode
  };
});
