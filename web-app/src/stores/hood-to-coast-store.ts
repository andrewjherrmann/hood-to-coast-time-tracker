import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { mockRaces } from './mock-data';
import type { 
  Runner, 
  Leg, 
  Race, 
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
  const isMockMode = ref(true);
  const isLoading = ref(false);
  const isAuthenticated = ref(false);
  const currentUser = ref<User | null>(null);

  // Authentication persistence
  const AUTH_STORAGE_KEY = 'htc-auth-session';
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

  // Initialize authentication state from localStorage
  const savedUser = loadAuthSession();
  if (savedUser) {
    isAuthenticated.value = true;
    currentUser.value = savedUser;
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
    return currentTeam.value.legs.reduce((total, leg) => total + leg.distance, 0);
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

  // Helper function to compare estimated vs actual time for a leg
  function getLegTimeComparison(leg: Leg): LegTimeComparison {
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
      ? (totalTimeDifference / totalEstimatedMinutes) * 100 
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

  const estimatedFinishTime = computed(() => {
    if (!currentTeam.value || !currentTeam.value.startTime) return null;
    
    let totalEstimatedMinutes = 0;
    
    // Find the last completed leg to get the cumulative time
    const completedLegs = currentTeam.value.legs.filter(leg => isLegCompleted(leg)).sort((a, b) => a.order - b.order);
    
    if (completedLegs.length > 0) {
      const lastCompletedLeg = completedLegs[completedLegs.length - 1];
      if (lastCompletedLeg) {
        // Calculate cumulative time from completed legs
        completedLegs.forEach(leg => {
          const actualTime = getLegActualTime(leg);
          if (actualTime !== null) {
            totalEstimatedMinutes += actualTime;
          }
        });
      }
    }
    
    // Add estimated times for remaining legs
    const remainingLegs = currentTeam.value.legs.filter(leg => !isLegCompleted(leg));
    remainingLegs.forEach(leg => {
      if (leg.runnerId) {
        const runner = currentTeam.value!.runners.find(r => r.id === leg.runnerId);
        if (runner) {
          totalEstimatedMinutes += calculateEstimatedTime(runner.estimatedPaceMinutes, runner.estimatedPaceSeconds, leg.distance);
        } else {
          totalEstimatedMinutes += calculateEstimatedTime(leg.estimatedPaceMinutes, leg.estimatedPaceSeconds, leg.distance);
        }
      } else {
        totalEstimatedMinutes += calculateEstimatedTime(leg.estimatedPaceMinutes, leg.estimatedPaceSeconds, leg.distance);
      }
    });
    
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
      leg.runnerId = runnerId;
      
      // Add time entry directly to the leg
      leg.timeEntry = {
        timestamp: new Date(actualTime),
        notes: ''
      };
    }
  }

  function updateLeg(id: string, updates: Partial<Omit<Leg, 'id' | 'order'>>) {
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
    
    // Remove leg (time entry is embedded, so it goes with the leg)
    currentTeam.value.legs = currentTeam.value.legs.filter(leg => leg.id !== id);
    
    // Reorder remaining legs
    currentTeam.value.legs.forEach((leg, index) => {
      leg.order = index + 1;
    });
  }

  function addLeg(leg: Omit<Leg, 'id' | 'order'>) {
    if (!currentTeam.value) return;
    
    const newLeg: Leg = {
      ...leg,
      id: `leg-${Date.now()}`,
      order: currentTeam.value.legs.length + 1
    };
    
    currentTeam.value.legs.push(newLeg);
  }

  // Note: Time management is now handled directly on legs via recordLegCompletionTime
  // and the timeEntry property on each leg

  function clearAllData() {
    if (!currentTeam.value) return;
    
    currentTeam.value.legs.forEach(leg => {
      delete leg.timeEntry;
      delete leg.runnerId;
    });
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

  function signIn(email: string, password: string) {
    // Mock authentication
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      isAuthenticated.value = true;
      currentUser.value = { id: user.id, email: user.email, name: user.name };
      saveAuthSession(currentUser.value);
      return true;
    }
    return false;
  }

  function signOut() {
    isAuthenticated.value = false;
    currentUser.value = null;
    clearAuthSession();
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
          id: `leg-${Date.now()}-${Math.random()}`
        })),
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
    if (leg && !leg.timeEntry) {
          // Add time entry directly to the leg
    leg.timeEntry = {
      timestamp: completionTime,
      notes: 'Recorded from dashboard'
    };
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
    getLegBestEstimatedTime,
    isLegCompleted,
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
    setActiveRace
  };
});
