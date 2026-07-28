import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { mockRaces } from './mock-data';
import { useMockData, getMockModeStatus, environment } from '../config/environment';
import { racesApi, isApiAvailable } from '../services/api';
import type { 
  Runner, 
  Leg, 
  Race, 
  Team,
  User, 
  AuthSession, 
  SessionInfo, 
  TeamPerformanceMetrics, 
  RunnerPerformanceMetrics, 
  LegTimeComparison 
} from '../types';

/**
 * Hood to Coast Race Tracker Store
 * 
 * Authentication Features:
 * - 24-hour persistent sessions using localStorage
 * - Automatic session refresh on user activity
 * - Session expiration warnings
 * - Manual session extension
 * 
 * Usage:
 * const store = useHoodToCoastStore();
 * 
 * // Check session status
 * const sessionInfo = store.getSessionInfo();
 * const timeRemaining = store.getSessionTimeRemaining();
 * const isExpiringSoon = store.isSessionExpiringSoon();
 * 
 * // Extend session manually
 * store.extendSession();
 * 
 * // Session automatically refreshes on user activity
 * // (clicks, keydown, scroll events)
 */

// Store
export const useHoodToCoastStore = defineStore('hood-to-coast', () => {
  // State
  const races = ref<Race[]>([]);
  const currentRaceId = ref<string | null>(null);
  const isMockMode = ref(useMockData);
  const isLoading = ref(false);
  const isAuthenticated = ref(false);
  const currentUser = ref<User | null>(null);
  
  // Data filtering state
  const hasFullDataAccess = ref(false);

  // Authentication persistence
  const AUTH_STORAGE_KEY = 'htc-auth-session';
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Computed
  const currentRace = computed(() => {
    if (!currentRaceId.value) return null;
    const race = races.value.find(race => race.id === currentRaceId.value);
    return race ? filterRaceData(race) : null;
  });

  const currentTeam = computed(() => currentRace.value?.team || null);

  const activeRace = computed(() => races.value.find(race => race.isActive) || null);

  // Races sorted by date descending (newest first) — use this for all dropdowns/lists
  const sortedRaces = computed(() =>
    [...races.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );

  // Check if store is fully initialized
  const isInitialized = computed(() => races.value.length > 0);

  // Find the most recent race (latest date, whether past or future)
  const nextUpcomingRace = computed(() => {
    if (races.value.length === 0) return null;
    
    // Sort races by date descending and return the first one (most recent)
    const sortedRaces = [...races.value].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedRaces[0];
  });

  // Don't initialize with mock data - wait for proper initialization
  races.value = [];

  // Initialize authentication state from localStorage
  const savedUser = loadAuthSession();
  if (savedUser) {
    isAuthenticated.value = true;
    currentUser.value = savedUser;
    hasFullDataAccess.value = true;
  }

  // Set up session refresh on user activity
  if (typeof window !== 'undefined') {
    const refreshSessionOnActivity = () => {
      if (isAuthenticated.value) {
        checkSessionValidity();
      }
    };

    // Refresh session on user interactions
    window.addEventListener('click', refreshSessionOnActivity);
    window.addEventListener('keydown', refreshSessionOnActivity);
    window.addEventListener('scroll', refreshSessionOnActivity);
  }

  // Computed
  const totalDistance = computed(() => {
    if (!currentTeam.value) return 0;
    const total = currentTeam.value.legs.reduce((total, leg) => total + leg.distance, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  });

  const completedLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => leg.timeEntry);
  });

  const remainingLegs = computed(() => {
    if (!currentTeam.value) return [];
    return currentTeam.value.legs.filter(leg => !leg.timeEntry);
  });

  const currentLeg = computed(() => {
    if (!currentTeam.value) return null;
    return currentTeam.value.legs.find(leg => !leg.timeEntry);
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

  // Helper function to get the best estimated time for a leg (runner pace if assigned, otherwise leg pace)
  function getLegBestEstimatedTime(leg: Leg): number {
    const runnerEstimated = getLegEstimatedTimeByRunner(leg);
    if (runnerEstimated !== null) {
      return runnerEstimated;
    }
    return getLegEstimatedTime(leg);
  }
  
  // Helper function to filter sensitive runner data based on authentication
  function filterRunnerData(runner: Runner): Runner {
    if (hasFullDataAccess.value) {
      return runner; // Return full data for authenticated users
    }
    
    // Return filtered data for unauthenticated users
    return {
      ...runner,
      email: '***@***.***',
      phone: '***-***-****'
    };
  }
  
  // Helper function to filter team data based on authentication
  function filterTeamData(team: Team): Team {
    return {
      ...team,
      runners: team.runners.map(filterRunnerData)
    };
  }
  
  // Helper function to filter race data based on authentication
  function filterRaceData(race: Race): Race {
    return {
      ...race,
      team: filterTeamData(race.team)
    };
  }

  // Helper function to check if a leg is completed
  function isLegCompleted(leg: Leg): boolean {
    return !!leg.timeEntry;
  }

  // Helper function to get actual time for a completed leg in minutes
  function getLegActualTime(leg: Leg): number | null {
    if (!leg.timeEntry || !currentTeam.value) return null;
    
    // Calculate actual time from timestamp and race start time
    const startTime = new Date(currentTeam.value.startTime);
    const actualTimeMinutes = Math.round((leg.timeEntry.timestamp.getTime() - startTime.getTime()) / (1000 * 60));
    return actualTimeMinutes;
  }

  // Helper function to get leg start time (estimated or actual from previous leg)
  function getLegStartTime(leg: Leg): Date | null {
    if (!currentTeam.value) return null;
    
    const sortedLegs = [...currentTeam.value.legs].sort((a, b) => a.order - b.order);
    const legIndex = sortedLegs.findIndex(l => l.id === leg.id);
    
    if (legIndex === 0) {
      // First leg starts at race start time
      return new Date(currentTeam.value.startTime);
    }
    
    const previousLeg = sortedLegs[legIndex - 1];
    if (!previousLeg) return null;
    
    if (previousLeg.timeEntry) {
      // Use actual end time of previous leg
      return new Date(previousLeg.timeEntry.timestamp);
    } else {
      // Calculate estimated start time based on previous leg's estimated end time
      const estimatedEndTime = new Date(currentTeam.value.startTime);
      for (let i = 0; i < legIndex; i++) {
        const currentLeg = sortedLegs[i];
        if (currentLeg) {
          const estimatedMinutes = getLegBestEstimatedTime(currentLeg);
          estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedMinutes);
        }
      }
      return estimatedEndTime;
    }
  }

  // Helper function to get leg end time (actual if completed, estimated if not)
  function getLegEndTime(leg: Leg): Date | null {
    if (!currentTeam.value) return null;
    
    if (leg.timeEntry) {
      // Use actual end time if leg is completed
      return new Date(leg.timeEntry.timestamp);
    } else {
      // Calculate estimated end time
      const startTime = getLegStartTime(leg);
      if (!startTime) return null;
      
      const estimatedMinutes = getLegBestEstimatedTime(leg);
      const estimatedEndTime = new Date(startTime);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedMinutes);
      return estimatedEndTime;
    }
  }

  // Helper function to get leg duration (time between start and end)
  function getLegDuration(leg: Leg): number | null {
    const startTime = getLegStartTime(leg);
    const endTime = getLegEndTime(leg);
    
    if (!startTime || !endTime) return null;
    
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  // Helper function to get leg actual duration (for completed legs)
  function getLegActualDuration(leg: Leg): number | null {
    if (!leg.timeEntry) return null;

    const startTime = getLegStartTime(leg);
    if (!startTime) return null;

    return Math.round((leg.timeEntry.timestamp.getTime() - startTime.getTime()) / (1000 * 60));
  }

  // Utility function for consistent date/time formatting
  function formatDateTime(date: Date, includeTime: boolean = true): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZoneName: 'short'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    
    return date.toLocaleString('en-US', options);
  }

  // Helper function to compare estimated vs actual time for a leg
  function getLegTimeComparison(leg: Leg): LegTimeComparison {
    const estimatedByRunner = getLegEstimatedTimeByRunner(leg);
    const estimatedByLeg = getLegEstimatedTime(leg);
    const estimatedMinutes = estimatedByRunner || estimatedByLeg;
    const actualMinutes = getLegActualDuration(leg);
    
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
    const percentageDifference = Math.round(((actualMinutes - estimatedMinutes) / estimatedMinutes) * 1000) / 10;
    
    return {
      estimatedMinutes,
      actualMinutes,
      differenceMinutes,
      isFaster,
      percentageDifference
    };
  }

  // Overall team performance metrics
  const teamPerformanceMetrics = computed((): TeamPerformanceMetrics | null => {
    if (!currentTeam.value) return null;
    
    const completedLegsWithTimes = currentTeam.value.legs.filter(leg => isLegCompleted(leg));
    if (completedLegsWithTimes.length === 0) return null;
    
    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
    let fasterLegs = 0;
    let slowerLegs = 0;
    let onPaceLegs = 0;
    let totalTimeDifference = 0;
    
    completedLegsWithTimes.forEach(leg => {
      const comparison = getLegTimeComparison(leg);
      if (comparison.actualMinutes !== null && comparison.differenceMinutes !== null) {
        totalEstimatedMinutes += comparison.estimatedMinutes;
        totalActualMinutes += comparison.actualMinutes;
        totalTimeDifference += comparison.differenceMinutes;
        
        if (comparison.isFaster === true) {
          fasterLegs++;
        } else if (comparison.isFaster === false) {
          slowerLegs++;
        } else {
          onPaceLegs++;
        }
      }
    });
    
    // Calculate percentage difference based on total time difference vs total estimated time
    const overallPercentageDifference = totalEstimatedMinutes > 0 
      ? Math.round((totalTimeDifference / totalEstimatedMinutes) * 10000) / 100 
      : 0;
    
    return {
      totalEstimatedMinutes,
      totalActualMinutes,
      totalTimeDifference,
      overallPercentageDifference,
      fasterLegs,
      slowerLegs,
      onPaceLegs,
      totalLegs: completedLegsWithTimes.length,
      averagePaceDifference: completedLegsWithTimes.length > 0 
        ? totalTimeDifference / completedLegsWithTimes.length 
        : 0
    };
  });

  // Individual runner performance
  const runnerPerformanceMetrics = computed((): RunnerPerformanceMetrics[] => {
    if (!currentTeam.value) return [];
    
    return currentTeam.value.runners.map(runner => {
      const runnerLegs = currentTeam.value!.legs.filter(leg => 
        leg.runnerId === runner.id && isLegCompleted(leg)
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
      let totalTimeDifference = 0;
      
      runnerLegs.forEach(leg => {
        const comparison = getLegTimeComparison(leg);
        if (comparison.actualMinutes !== null && comparison.differenceMinutes !== null) {
          totalEstimatedMinutes += comparison.estimatedMinutes;
          totalActualMinutes += comparison.actualMinutes;
          totalTimeDifference += comparison.differenceMinutes;
          
          if (comparison.isFaster === true) {
            fasterLegs++;
          } else if (comparison.isFaster === false) {
            slowerLegs++;
          }
        }
      });
      
      const averagePaceDifference = runnerLegs.length > 0 
        ? totalTimeDifference / runnerLegs.length 
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

  // Original estimated finish time (based on planned paces before race started)
  const originalEstimatedFinishTime = computed(() => {
    if (!currentTeam.value || !currentTeam.value.startTime) return null;
    
    let totalEstimatedMinutes = 0;
    currentTeam.value.legs.forEach(leg => {
      totalEstimatedMinutes += getLegBestEstimatedTime(leg);
    });
    
    const finishTime = new Date(currentTeam.value.startTime);
    finishTime.setMinutes(finishTime.getMinutes() + totalEstimatedMinutes);
    return finishTime;
  });

  // Current estimated finish time (for races in progress)
  const currentEstimatedFinishTime = computed(() => {
    if (!currentTeam.value || !currentTeam.value.startTime) return null;
    
    // If race is completed, return null (use actual finish time instead)
    if (currentTeam.value.legs.every(leg => isLegCompleted(leg))) {
      return null;
    }
    
    let totalEstimatedMinutes = 0;
    
    // Use actual times for completed legs
    const completedLegs = currentTeam.value.legs.filter(leg => isLegCompleted(leg));
    completedLegs.forEach(leg => {
      const actualTime = getLegActualTime(leg);
      if (actualTime !== null) {
        totalEstimatedMinutes += actualTime;
      }
    });
    
    // Add estimated times for remaining legs
    const remainingLegs = currentTeam.value.legs.filter(leg => !isLegCompleted(leg));
    remainingLegs.forEach(leg => {
      totalEstimatedMinutes += getLegBestEstimatedTime(leg);
    });
    
    const finishTime = new Date(currentTeam.value.startTime);
    finishTime.setMinutes(finishTime.getMinutes() + totalEstimatedMinutes);
    return finishTime;
  });

  // Actual finish time (for completed races)
  const actualFinishTime = computed(() => {
    if (!currentTeam.value || !currentTeam.value.startTime) return null;
    
    // Only return actual finish time if all legs are completed
    if (!currentTeam.value.legs.every(leg => isLegCompleted(leg))) {
      return null;
    }
    
    // Find the last completed leg
    const lastCompletedLeg = [...currentTeam.value.legs]
      .filter(leg => isLegCompleted(leg))
      .sort((a, b) => b.order - a.order)[0];
    
    return lastCompletedLeg?.timeEntry?.timestamp || null;
  });

  // Legacy computed property for backward compatibility
  const estimatedFinishTime = computed(() => {
    // For completed races, return original estimated time
    // For races in progress, return current estimated time
    if (currentTeam.value?.legs.every(leg => isLegCompleted(leg))) {
      return originalEstimatedFinishTime.value;
    } else {
      return currentEstimatedFinishTime.value;
    }
  });

  const progressPercentage = computed(() => {
    if (!currentTeam.value || currentTeam.value.legs.length === 0) return 0;
    return (completedLegs.value.length / currentTeam.value.legs.length) * 100;
  });

  // Actions
  async function addRunner(runner: Omit<Runner, 'id'>) {
    if (!currentTeam.value) return;
    
    const newRunner: Runner = {
      ...runner,
      id: `runner-${Date.now()}`
    };
    
    currentTeam.value.runners.push(newRunner);
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save runner addition to API:', error);
      }
    }
  }

  async function updateRunner(id: string, updates: Partial<Omit<Runner, 'id'>>) {
    if (!currentTeam.value) return;
    
    const runner = currentTeam.value.runners.find(r => r.id === id);
    if (runner) {
      Object.assign(runner, updates);
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save runner update to API:', error);
        }
      }
    }
  }

  async function deleteRunner(id: string) {
    if (!currentTeam.value) return;
    
    // Remove runner from legs first
    currentTeam.value.legs.forEach(leg => {
      if (leg.runnerId === id) {
        delete leg.runnerId;
      }
    });
    
    // Remove runner from legs (times are now embedded in legs)
    currentTeam.value.legs.forEach(leg => {
      if (leg.runnerId === id) {
        delete leg.runnerId;
        // Clear time entry if it exists
        if (leg.timeEntry) {
          delete leg.timeEntry;
        }
      }
    });
    
    // Remove runner
    currentTeam.value.runners = currentTeam.value.runners.filter(r => r.id !== id);
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save runner deletion to API:', error);
      }
    }
  }

  async function assignRunnerToLeg(legId: string, runnerId: string | undefined) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      // Prevent assignment changes for completed legs
      if (isLegCompleted(leg)) {
        console.warn(`Cannot change runner assignment for completed leg ${legId}`);
        return;
      }
      
      if (runnerId) {
        leg.runnerId = runnerId;
        // Note: We don't update the leg's pace when assigning a runner
        // The leg keeps its own pace, but we can calculate estimated time
        // based on either the leg's pace or the runner's pace
      } else {
        delete leg.runnerId;
      }
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save runner assignment to API:', error);
        }
      }
    }
  }

  async function reorderLegs(newOrder: string[]) {
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
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save leg reordering to API:', error);
      }
    }
  }

  async function completeLeg(legId: string, actualTime: number, runnerId: string) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg) {
      leg.runnerId = runnerId;
      
      // Add time entry directly to the leg
      leg.timeEntry = {
        timestamp: new Date(actualTime),
        notes: ''
      };
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save leg completion to API:', error);
        }
      }
    }
  }

  async function updateLeg(id: string, updates: Partial<Omit<Leg, 'id' | 'order'>>) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === id);
    if (leg) {
      Object.assign(leg, updates);
      // Note: We no longer update estimated time automatically
      // The leg's pace determines the estimated time
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save leg update to API:', error);
        }
      }
    }
  }

  async function deleteLeg(id: string) {
    if (!currentTeam.value) return;
    
    // Remove leg (time entry is embedded, so it goes with the leg)
    currentTeam.value.legs = currentTeam.value.legs.filter(leg => leg.id !== id);
    
    // Reorder remaining legs
    currentTeam.value.legs.forEach((leg, index) => {
      leg.order = index + 1;
    });
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save leg deletion to API:', error);
      }
    }
  }

  async function addLeg(leg: Omit<Leg, 'id' | 'order'>) {
    if (!currentTeam.value) return;
    
    const newLeg: Leg = {
      ...leg,
      id: `leg-${Date.now()}`,
      order: currentTeam.value.legs.length + 1
    };
    
    currentTeam.value.legs.push(newLeg);
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save leg addition to API:', error);
      }
    }
  }

  // Note: Time management is now handled directly on legs via recordLegCompletionTime
  // and the timeEntry property on each leg

  async function clearAllData() {
    if (!currentTeam.value) return;
    
    currentTeam.value.legs.forEach(leg => {
      delete leg.timeEntry;
      delete leg.runnerId;
    });
    
    // Save the updated race to API
    if (currentRace.value) {
      try {
        await saveRaceToApi(currentRace.value);
      } catch (error) {
        console.error('Failed to save cleared data to API:', error);
      }
    }
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

  // Authentication persistence functions
  function saveAuthSession(user: User) {
    const sessionData: AuthSession = {
      user,
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
  }

  function loadAuthSession(): User | null {
    try {
      const sessionData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!sessionData) return null;

      const session: AuthSession = JSON.parse(sessionData);
      const now = Date.now();

      // Check if session has expired
      if (now > session.expiresAt) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      return session.user;
    } catch (error) {
      console.error('Error loading auth session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  function clearAuthSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function refreshAuthSession() {
    if (currentUser.value && isAuthenticated.value) {
      saveAuthSession(currentUser.value);
    }
  }

  function checkSessionValidity() {
    if (isAuthenticated.value && currentUser.value) {
      const sessionData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          const now = Date.now();
          
          // If session expires in less than 1 hour, refresh it
          if (session.expiresAt - now < 60 * 60 * 1000) {
            refreshAuthSession();
          }
        } catch (error) {
          console.error('Error checking session validity:', error);
        }
      }
    }
  }

  function getSessionInfo(): SessionInfo | null {
    if (!isAuthenticated.value || !currentUser.value) return null;
    
    try {
      const sessionData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!sessionData) return null;
      
      const session: AuthSession = JSON.parse(sessionData);
      const now = Date.now();
      const timeRemaining = session.expiresAt - now;
      
      return {
        user: currentUser.value,
        expiresAt: new Date(session.expiresAt),
        timeRemaining: Math.max(0, timeRemaining),
        isExpired: timeRemaining <= 0
      };
    } catch {
      return null;
    }
  }

  function getSessionTimeRemaining(): string {
    const sessionInfo = getSessionInfo();
    if (!sessionInfo) return 'No active session';
    
    const { timeRemaining } = sessionInfo;
    if (timeRemaining <= 0) return 'Session expired';
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  function extendSession() {
    if (isAuthenticated.value && currentUser.value) {
      refreshAuthSession();
      return true;
    }
    return false;
  }

  function isSessionExpiringSoon(): boolean {
    const sessionInfo = getSessionInfo();
    if (!sessionInfo) return false;
    
    // Return true if session expires in less than 30 minutes
    return sessionInfo.timeRemaining < 30 * 60 * 1000;
  }

  async function signIn(email: string, password: string) {
    // Mock authentication
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      isAuthenticated.value = true;
      currentUser.value = { id: user.id, email: user.email, name: user.name };
      saveAuthSession(currentUser.value);
      
      // Grant full data access
      hasFullDataAccess.value = true;
      
      // Reload data to get full information for authenticated user
      if (!isMockMode.value && isApiAvailable()) {
        try {
          await loadRacesFromApi();
        } catch (error) {
          console.error('Failed to reload data after authentication:', error);
        }
      }
      
      return true;
    }
    return false;
  }

  function signOut() {
    isAuthenticated.value = false;
    currentUser.value = null;
    hasFullDataAccess.value = false;
    clearAuthSession();
  }

  // Race management functions
  async function createRace(raceData: Omit<Race, 'id' | 'isActive' | 'locked'>) {
    const newRace: Race = {
      ...raceData,
      id: `race-${Date.now()}`,
      isActive: false,
      locked: false
    };
    
    // Add to local state first for immediate UI update
    races.value.push(newRace);
    
    // Save to API if available
    try {
      const savedRace = await saveRaceToApi(newRace);
      // Update the race with the API response (in case ID changed)
      const index = races.value.findIndex(r => r.id === newRace.id);
      if (index !== -1) {
        races.value[index] = savedRace;
      }
      return savedRace;
    } catch (error) {
      console.error('Failed to save race to API:', error);
      // Return the local race even if API save failed
      return newRace;
    }
  }

  async function duplicateRace(raceId: string, newName: string, newDate: Date) {
    const sourceRace = races.value.find(r => r.id === raceId);
    if (!sourceRace) return null;

    // Deep clone the race data
    const duplicatedRace: Race = {
      id: `race-${Date.now()}`,
      name: newName,
      date: newDate,
      isActive: false,
      locked: false,
      team: {
        ...sourceRace.team,
        id: `team-${Date.now()}`,
        startTime: new Date(newDate.getTime() + (sourceRace.team.startTime.getTime() - sourceRace.date.getTime())),
        legs: sourceRace.team.legs.map(leg => ({
          ...leg,
          id: `leg-${Date.now()}-${Math.random()}`
        })),
        runners: sourceRace.team.runners.map(runner => ({
          ...runner,
          id: `runner-${Date.now()}-${Math.random()}`
        }))
      }
    };

    // Add to local state first for immediate UI update
    races.value.push(duplicatedRace);
    
    // Save to API if available
    try {
      const savedRace = await saveRaceToApi(duplicatedRace);
      // Update the race with the API response (in case ID changed)
      const index = races.value.findIndex(r => r.id === duplicatedRace.id);
      if (index !== -1) {
        races.value[index] = savedRace;
      }
      return savedRace;
    } catch (error) {
      console.error('Failed to save duplicated race to API:', error);
      // Return the local race even if API save failed
      return duplicatedRace;
    }
  }

  async function setCurrentRace(raceId: string) {
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      currentRaceId.value = raceId;
      
      // Save the current race selection to API if it's a real race (not mock)
      if (!race.id.startsWith('race-')) {
        try {
          await saveRaceToApi(race);
        } catch (error) {
          console.error('Failed to save current race selection to API:', error);
        }
      }
    }
  }

  async function updateRace(raceId: string, updates: Partial<Omit<Race, 'id'>>) {
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      // Update local state first for immediate UI update
      Object.assign(race, updates);
      
      // Save to API if available
      try {
        const savedRace = await saveRaceToApi(race);
        // Update the race with the API response
        const index = races.value.findIndex(r => r.id === raceId);
        if (index !== -1) {
          races.value[index] = savedRace;
        }
        return savedRace;
      } catch (error) {
        console.error('Failed to save race to API:', error);
        // Return the local race even if API save failed
        return race;
      }
    }
  }

  async function deleteRace(raceId: string) {
    const raceIndex = races.value.findIndex(r => r.id === raceId);
    if (raceIndex !== -1) {
      // Delete from API first if available
      try {
        await deleteRaceFromApi(raceId);
        console.log('Race deleted from API');
      } catch (error) {
        console.error('Failed to delete race from API:', error);
        // Continue with local deletion even if API fails
      }
      
      // Remove from local state
      races.value.splice(raceIndex, 1);
      
      // If we deleted the current race, set to first available
      if (currentRaceId.value === raceId) {
        currentRaceId.value = races.value[0]?.id || null;
      }
    }
  }

  async function recordLegCompletionTime(legId: string, completionTime: Date) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg && !leg.timeEntry) {
      // Add time entry directly to the leg
      leg.timeEntry = {
        timestamp: completionTime,
        notes: 'Recorded from dashboard'
      };
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save leg completion time to API:', error);
        }
      }
    }
  }

  async function updateLegCompletionTime(legId: string, completionTime: Date) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg && leg.timeEntry) {
      leg.timeEntry.timestamp = completionTime;
      leg.timeEntry.notes = 'Updated completion time';
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save leg completion time update to API:', error);
        }
      }
    }
  }

  async function removeLegCompletionTime(legId: string) {
    if (!currentTeam.value) return;
    
    const leg = currentTeam.value.legs.find(l => l.id === legId);
    if (leg && leg.timeEntry) {
      delete leg.timeEntry;
      
      // Save the updated race to API
      if (currentRace.value) {
        try {
          await saveRaceToApi(currentRace.value);
        } catch (error) {
          console.error('Failed to save leg completion time removal to API:', error);
        }
      }
    }
  }

  async function setActiveRace(raceId: string) {
    // Set all races as inactive first
    races.value.forEach(race => {
      race.isActive = false;
    });
    
    // Set the selected race as active
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      race.isActive = true;
      
      // Save the updated race to API
      try {
        await saveRaceToApi(race);
      } catch (error) {
        console.error('Failed to save active race to API:', error);
      }
    }
  }

  async function lockRace(raceId: string) {
    const race = races.value.find(r => r.id === raceId);
    if (race) {
      race.locked = true;
      
      // Save the updated race to API
      try {
        await saveRaceToApi(race);
      } catch (error) {
        console.error('Failed to save race lock to API:', error);
      }
    }
  }

  // API Integration Functions
  async function loadRacesFromApi() {
    if (isMockMode.value || !isApiAvailable()) {
      console.log('Using mock data or API not available');
      return;
    }

    try {
      isLoading.value = true;
      const response = await racesApi.getAll();
      
      // Parse API data to convert timestamp strings to Date objects
      const parsedRaces = response.races.map(race => {
        const parsedRace = {
          ...race,
          date: new Date(race.date),
          team: race.team ? {
            ...race.team,
            startTime: race.team.startTime ? new Date(race.team.startTime) : new Date(),
            legs: race.team.legs ? race.team.legs.map(leg => ({
              ...leg,
              timeEntry: leg.timeEntry ? {
                ...leg.timeEntry,
                timestamp: leg.timeEntry.timestamp ? new Date(leg.timeEntry.timestamp) : new Date()
              } : undefined
            })) : []
          } : race.team
        };
        return parsedRace as Race;
      });
      
      // Store the full data internally
      races.value = parsedRaces;
      console.log(`Loaded ${response.count} races from API`);
      
      // Apply data filtering based on authentication status
      // The computed properties will automatically filter the data
      
      // Auto-select the most recent race after loading from API
      if (races.value.length > 0 && !currentRaceId.value) {
        const mostRecent = nextUpcomingRace.value;
        if (mostRecent) {
          currentRaceId.value = mostRecent.id;
          console.log(`Auto-selected race: ${mostRecent.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to load races from API:', error);
      // Don't fall back to mock data here - let initializeStore handle it
      races.value = [];
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function saveRaceToApi(race: Race) {
    if (isMockMode.value || !isApiAvailable()) {
      console.log('Using mock data or API not available');
      return race;
    }

    try {
      isLoading.value = true;
      if (race.id.startsWith('race-')) {
        // New race - create
        const response = await racesApi.create(race);
        console.log('Created race via API:', response.message);
        return response.race;
      } else {
        // Existing race - update
        const response = await racesApi.update(race.id, race);
        console.log('Updated race via API:', response.message);
        return response.race;
      }
    } catch (error) {
      console.error('Failed to save race to API:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteRaceFromApi(raceId: string) {
    if (isMockMode.value || !isApiAvailable()) {
      console.log('Using mock data or API not available');
      return;
    }

    try {
      isLoading.value = true;
      await racesApi.delete(raceId);
      console.log('Deleted race via API');
    } catch (error) {
      console.error('Failed to delete race from API:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  // Mock mode toggle function
  function toggleMockModeForDevelopment(useMock: boolean) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('htc-mock-mode', useMock.toString());
      // Reload the page to apply the new mode
      window.location.reload();
    }
  }
  
  // Function to reload data after authentication
  async function reloadDataAfterAuth() {
    if (hasFullDataAccess.value && !isMockMode.value && isApiAvailable()) {
      try {
        await loadRacesFromApi();
      } catch (error) {
        console.error('Failed to reload data after authentication:', error);
      }
    }
  }

  // Get API status
  function getApiStatus() {
    return {
      isMockMode: isMockMode.value,
      isApiAvailable: isApiAvailable(),
      isLoading: isLoading.value,
      mockModeStatus: getMockModeStatus(),
      baseUrl: import.meta.env.VITE_API_URL || 'https://htcapi.dev.your-domain.com',
    };
  }

  // Initialize the store after all functions are defined
  const initializeStore = async () => {
    try {
      if (isMockMode.value) {
        // Mock mode: load mock data immediately
        races.value = [...mockRaces];
        // Note: Data filtering will be applied through computed properties
        const mostRecent = nextUpcomingRace.value;
        if (mostRecent) {
          mostRecent.isActive = true;
          currentRaceId.value = mostRecent.id;
        }
      } else {
        // Live mode: try to load from API first
        await loadRacesFromApi();
        
        // If API fails or returns no data, fall back to mock data
        if (races.value.length === 0) {
          console.log('API returned no data, falling back to mock data');
          races.value = [...mockRaces];
          const mostRecent = nextUpcomingRace.value;
          if (mostRecent) {
            mostRecent.isActive = true;
            currentRaceId.value = mostRecent.id;
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize store:', error);
      // Fall back to mock data on any error
      races.value = [...mockRaces];
      const mostRecent = nextUpcomingRace.value;
      if (mostRecent) {
        mostRecent.isActive = true;
        currentRaceId.value = mostRecent.id;
      }
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize the store
  // Note: initializeStore is async but we can't await it here in the store definition
  // The store will initialize asynchronously when called
  void initializeStore();

  return {
    // State
    races,
    currentRaceId,
    isMockMode,
    isLoading,
    isAuthenticated,
    currentUser,
    hasFullDataAccess,
    
    // Computed
    currentRace,
    currentTeam,
    activeRace,
    sortedRaces,
    isInitialized,
    totalDistance,
    completedLegs,
    remainingLegs,
    currentLeg,
    estimatedFinishTime,
    originalEstimatedFinishTime,
    currentEstimatedFinishTime,
    actualFinishTime,
    progressPercentage,
    teamPerformanceMetrics,
    runnerPerformanceMetrics,
    
    // Helper functions
    calculateEstimatedTime,
    getLegEstimatedTime,
    getLegEstimatedTimeByRunner,
    getLegBestEstimatedTime,
    isLegCompleted,
    getLegActualTime,
    getLegStartTime,
    getLegEndTime,
    getLegDuration,
    getLegActualDuration,
    getLegTimeComparison,
    formatDateTime,
    
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

    clearAllData,
    toggleMockMode,
    signIn,
    signOut,
    refreshAuthSession,
    checkSessionValidity,
    getSessionInfo,
    getSessionTimeRemaining,
    extendSession,
    isSessionExpiringSoon,
    createRace,
    duplicateRace,
    setCurrentRace,
    updateRace,
    deleteRace,
    recordLegCompletionTime,
    updateLegCompletionTime,
    removeLegCompletionTime,
    setActiveRace,
    lockRace,
    
    // API Integration
    loadRacesFromApi,
    saveRaceToApi,
    deleteRaceFromApi,
    toggleMockModeForDevelopment,
    reloadDataAfterAuth,
    getApiStatus,
    
    // Environment info
    environment: environment
  };
});
