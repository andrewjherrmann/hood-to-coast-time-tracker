// Performance-related types

export interface TeamPerformanceMetrics {
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  totalTimeDifference: number;
  overallPercentageDifference: number;
  fasterLegs: number;
  slowerLegs: number;
  onPaceLegs: number;
  totalLegs: number;
  averagePaceDifference: number;
}

export interface RunnerPerformanceMetrics {
  runnerId: string;
  runnerName: string;
  completedLegs: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  averagePaceDifference: number;
  fasterLegs: number;
  slowerLegs: number;
}

export interface LegTimeComparison {
  estimatedMinutes: number;
  actualMinutes: number | null;
  differenceMinutes: number | null;
  isFaster: boolean | null;
  percentageDifference: number | null;
}
