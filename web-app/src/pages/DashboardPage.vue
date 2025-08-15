<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div class="col">
        <div class="row items-center q-mb-sm">
          <div class="col">
            <h4 class="q-my-none">{{ currentTeam?.name || 'Team Dashboard' }}</h4>
            <p class="q-mt-sm q-mb-none text-grey-7">
              Start Time: {{ formatStartTime(currentTeam?.startTime) }}
            </p>
          </div>
          <div class="col-auto">
            <q-select
              v-model="selectedRaceId"
              :options="raceOptions"
              option-label="name"
              option-value="id"
              label="Select Race"
              outlined
              dense
              style="min-width: 200px;"
              @update:model-value="onRaceChange"
            >
              <template v-slot:prepend>
                <q-icon name="flag" />
              </template>
              <template v-slot:selected>
                <div v-if="selectedRaceId" class="text-body1">
                  {{ getSelectedRaceName() }} - {{ formatDate(getSelectedRaceDate()) }}
                </div>
              </template>
            </q-select>
          </div>
        </div>
      </div>
      <div class="col-auto">
        <q-chip
          :color="isMockMode ? 'orange' : 'green'"
          text-color="white"
          :label="isMockMode ? 'Mock Mode' : 'Live Mode'"
          size="sm"
        />
      </div>
    </div>

    <!-- Progress Overview -->
    <div class="row q-gutter-md q-mb-lg">
             <div class="col-12 col-md-3">
         <q-card class="text-center">
           <q-card-section>
             <div class="text-h4 text-primary">{{ totalDistance }}</div>
             <div class="text-caption">Total Distance (miles)</div>
           </q-card-section>
         </q-card>
       </div>
       <div class="col-12 col-md-3">
         <q-card class="text-center">
           <q-card-section>
             <div class="text-h4 text-positive">{{ completedLegs.length }}</div>
             <div class="text-caption">Completed Legs</div>
           </q-card-section>
         </q-card>
       </div>
       <div class="col-12 col-md-3">
         <q-card class="text-center">
           <q-card-section>
             <div class="text-h4 text-info">{{ remainingLegs.length }}</div>
             <div class="text-caption">Remaining Legs</div>
           </q-card-section>
         </q-card>
       </div>
       <div class="col-12 col-md-3">
         <q-card class="text-center">
           <q-card-section>
             <div class="text-h4 text-secondary">{{ progressPercentage.toFixed(1) }}%</div>
             <div class="text-caption">Progress</div>
           </q-card-section>
         </q-card>
       </div>
    </div>

    <!-- Progress Bar -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Race Progress</div>
        <q-linear-progress
          :value="progressPercentage / 100"
          color="primary"
          size="lg"
        />
        <div class="text-caption q-mt-sm">
          {{ completedLegs.length }} of {{ currentTeam?.legs.length || 0 }} legs completed
        </div>
      </q-card-section>
    </q-card>

    <!-- Current Leg Focus -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Current Focus</div>
        <div v-if="currentLeg" class="text-center">
                        <div class="text-h4 text-primary q-mb-sm">Leg {{ currentLeg.order }}</div>
          <div class="row q-gutter-md justify-center">
                         <q-chip
               :color="getDifficultyColor(currentLeg.difficulty)"
               text-color="white"
               :label="currentLeg.difficulty"
               size="lg"
             />
             <q-chip
               color="primary"
               text-color="white"
               :label="`${currentLeg.distance} mi`"
               size="lg"
             />
             <q-chip
               color="secondary"
               text-color="white"
               :label="`${store.getLegEstimatedTime(currentLeg)} min`"
               size="lg"
             />
                          <q-chip
                v-if="store.actualFinishTime"
                color="positive"
                text-color="white"
                :label="`Finished: ${formatFinishTime(store.actualFinishTime)}`"
                size="lg"
              />
              <q-chip
                v-else-if="store.currentEstimatedFinishTime"
                color="warning"
                text-color="white"
                :label="`Est. Finish: ${formatFinishTime(store.currentEstimatedFinishTime)}`"
                size="lg"
              />
              <q-chip
                v-else-if="store.originalEstimatedFinishTime"
                color="info"
                text-color="white"
                :label="`Est. Finish: ${formatFinishTime(store.originalEstimatedFinishTime)}`"
                size="lg"
              />
              
              <!-- Show runner's estimated time if different from leg's estimated time -->
              <q-chip
                v-if="store.getLegEstimatedTimeByRunner(currentLeg) && 
                       store.getLegEstimatedTimeByRunner(currentLeg) !== store.getLegEstimatedTime(currentLeg)"
                color="accent"
                text-color="white"
                :label="`${store.getLegEstimatedTimeByRunner(currentLeg)} min (runner)`"
                size="lg"
              />
          </div>
          
                     <!-- Runner Assignment -->
           <div v-if="currentLeg.runnerId" class="q-mt-md">
             <q-chip
               color="dark"
               text-color="white"
               :label="`Runner: ${getRunnerName(currentLeg.runnerId)}`"
               size="md"
             />
            <div class="text-caption q-mt-xs">
              Pace: {{ getRunnerPace(currentLeg.runnerId) }} / mile
            </div>
            
            <!-- Performance Comparison for Completed Legs -->
            <div v-if="store.isLegCompleted(currentLeg)" class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm">Performance vs Estimated</div>
              <div class="row q-gutter-md justify-center">
                <div class="col-12 col-md-6">
                  <q-card class="text-center" :class="getLegPerformanceClass(currentLeg)">
                    <q-card-section>
                      <div class="text-h6 q-mb-sm">
                        {{ formatLegPerformance(currentLeg) }}
                      </div>
                      <div class="text-caption">
                        {{ getLegPerformanceMessage(currentLeg) }}
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>
            
            <!-- Quick Time Recording - Only show when authenticated -->
            <div v-if="store.isAuthenticated" class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm">Record Completion Time</div>
              
                             <!-- Current Time Display -->
               <div class="text-caption q-mb-sm text-center">
                 Current Time: {{ formatCurrentTimeWithDate() }}
               </div>
              
              <!-- Quick Start Button -->
              <div class="q-mb-md">
                <q-btn
                  color="blue"
                  icon="schedule"
                  label="Set Current Time"
                  @click="setCurrentTime"
                  class="full-width"
                />
              </div>
              
              <!-- DateTime Picker -->
              <div class="q-mb-md">
                <div class="row q-gutter-md">
                  <div class="col-12 col-md-6">
                    <q-input
                      v-model="completionDate"
                      label="Completion Date"
                      outlined
                      dense
                      class="full-width"
                      readonly
                    >
                      <template v-slot:append>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-date
                              v-model="completionDate"
                              mask="YYYY-MM-DD"
                            />
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input
                      v-model="completionTime"
                      label="Completion Time"
                      outlined
                      dense
                      class="full-width"
                      readonly
                    >
                      <template v-slot:append>
                        <q-icon name="access_time" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-time
                              v-model="completionTime"
                              mask="hh:mm A"
                              format24h
                            />
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>
              
              <div class="q-mt-sm">
                <q-btn
                  color="green"
                  icon="timer"
                  label="Record Completion"
                  @click="recordCompletionTime"
                  :loading="isRecordingTime"
                  :disable="!completionDateTime"
                  class="full-width"
                />
              </div>
            </div>
            
            <!-- Show message when not authenticated -->
            <div v-else class="q-mt-md">
              <q-chip
                color="orange"
                text-color="white"
                label="Sign in to record completion times"
                size="md"
              />
            </div>
          </div>
          <div v-else class="q-mt-md">
            <q-chip
              color="grey"
              text-color="white"
              label="No Runner Assigned"
              size="md"
            />
          </div>
        </div>
        <div v-else class="text-center text-grey-6">
          <q-icon name="flag" size="48px" />
          <div class="text-h6 q-mt-sm">All legs completed!</div>
        </div>
      </q-card-section>
    </q-card>

                   <!-- Finish Time Information -->
      <q-card class="q-mb-lg">
        <q-card-section>
          <div class="text-h6 q-mb-md">Finish Time Information</div>
          
          <!-- For completed races -->
          <div v-if="store.actualFinishTime" class="text-center">
            <div class="row q-gutter-md">
              <div class="col-12 col-md-6">
                <div class="text-subtitle2 q-mb-sm">Original Estimated Finish Time</div>
                                 <div class="text-h5 text-blue q-mb-sm">
                   {{ store.originalEstimatedFinishTime ? formatFinishTime(store.originalEstimatedFinishTime) : 'Not available' }}
                 </div>
                 <div class="text-caption">Based on planned paces</div>
               </div>
               <div class="col-12 col-md-6">
                 <div class="text-subtitle2 q-mb-sm">Actual Finish Time</div>
                 <div class="text-h4 text-green q-mb-sm">
                   {{ store.actualFinishTime ? formatFinishTime(store.actualFinishTime) : 'Not available' }}
                 </div>
                 <div class="text-caption">When race was completed</div>
               </div>
            </div>
          </div>
          
          <!-- For races in progress -->
          <div v-else-if="store.currentEstimatedFinishTime" class="text-center">
            <div class="row q-gutter-md">
              <div class="col-12 col-md-6">
                <div class="text-subtitle2 q-mb-sm">Original Estimated Finish Time</div>
                                 <div class="text-h5 text-blue q-mb-sm">
                   {{ store.originalEstimatedFinishTime ? formatFinishTime(store.originalEstimatedFinishTime) : 'Not available' }}
                 </div>
                 <div class="text-caption">Based on planned paces</div>
               </div>
               <div class="col-12 col-md-6">
                 <div class="text-subtitle2 q-mb-sm">Current Estimated Finish Time</div>
                 <div class="text-h5 text-orange q-mb-sm">
                   {{ store.currentEstimatedFinishTime ? formatFinishTime(store.currentEstimatedFinishTime) : 'Not available' }}
                 </div>
                 <div class="text-caption">Based on completed legs + estimated remaining</div>
               </div>
            </div>
          </div>
          
          <!-- For races not started -->
          <div v-else-if="store.originalEstimatedFinishTime" class="text-center">
            <div class="text-subtitle2 q-mb-sm">Original Estimated Finish Time</div>
                         <div class="text-h4 text-blue q-mb-sm">
               {{ store.originalEstimatedFinishTime ? formatFinishTime(store.originalEstimatedFinishTime) : 'Not available' }}
             </div>
             <div class="text-caption">Based on planned paces</div>
          </div>
          
          <!-- Fallback -->
          <div v-else class="text-center text-grey-6">
            <q-icon name="schedule" size="48px" />
            <div class="text-h6 q-mt-sm">No start time set</div>
          </div>
        </q-card-section>
      </q-card>

     <!-- Race Completion Summary -->
     <q-card v-if="completedLegs.length > 0" class="q-mb-lg">
       <q-card-section>
         <div class="text-h6 q-mb-md">Race Completion Summary</div>
         <div class="row q-gutter-md">
                       <div class="col-12 col-md-6">
              <q-card class="text-center bg-info-1">
                <q-card-section>
                  <div class="text-h5 text-info q-mb-sm">
                    {{ formatTotalDuration(getTotalEstimatedDuration()) }}
                  </div>
                  <div class="text-caption">Estimated Total Duration</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card class="text-center bg-secondary-1">
                <q-card-section>
                  <div class="text-h5 text-secondary q-mb-sm">
                    {{ formatTotalDuration(getTotalActualDuration()) }}
                  </div>
                  <div class="text-caption">Actual Total Duration</div>
                </q-card-section>
              </q-card>
            </div>

         </div>
       </q-card-section>
     </q-card>

     <!-- Performance Dashboard -->
    <q-card v-if="store.teamPerformanceMetrics" class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Performance Dashboard</div>
        
        <!-- Overall Team Performance -->
        <div class="row q-gutter-md q-mb-lg">
          <div class="col-12 col-md-4">
            <q-card class="text-center" :class="getPerformanceCardClass(store.teamPerformanceMetrics.overallPercentageDifference)">
              <q-card-section>
                <div class="text-h5 q-mb-sm">
                  {{ formatTimeDifference(store.teamPerformanceMetrics.totalTimeDifference) }}
                </div>
                <div class="text-caption">
                  {{ store.teamPerformanceMetrics.overallPercentageDifference > 0 ? 'Slower' : 'Faster' }} than Estimated
                </div>
                <div class="text-caption text-grey-6">
                  {{ store.teamPerformanceMetrics.overallPercentageDifference.toFixed(1) }}% difference
                </div>
              </q-card-section>
            </q-card>
          </div>
          
                     <div class="col-12 col-md-4">
             <q-card class="text-center bg-positive-1">
               <q-card-section>
                 <div class="text-h5 text-positive q-mb-sm">{{ store.teamPerformanceMetrics.fasterLegs }}</div>
                 <div class="text-caption">Legs Faster than Estimated</div>
                 <div class="text-caption text-grey-6">
                   {{ store.teamPerformanceMetrics.totalLegs > 0 ? ((store.teamPerformanceMetrics.fasterLegs / store.teamPerformanceMetrics.totalLegs) * 100).toFixed(0) : 0 }}% of completed
                 </div>
               </q-card-section>
             </q-card>
           </div>
           
           <div class="col-12 col-md-4">
             <q-card class="text-center bg-warning-1">
               <q-card-section>
                 <div class="text-h5 text-warning q-mb-sm">{{ store.teamPerformanceMetrics.slowerLegs }}</div>
                 <div class="text-caption">Legs Slower than Estimated</div>
                 <div class="text-caption text-grey-6">
                   {{ store.teamPerformanceMetrics.totalLegs > 0 ? ((store.teamPerformanceMetrics.slowerLegs / store.teamPerformanceMetrics.totalLegs) * 100).toFixed(0) : 0 }}% of completed
                 </div>
               </q-card-section>
             </q-card>
           </div>
        </div>
        
                 <!-- Performance Chart -->
         <div class="q-mb-lg">
           <div class="text-subtitle2 q-mb-sm">Performance Distribution</div>
           <div class="row q-gutter-sm">
             <div class="col-12 col-md-6">
               <div class="text-caption q-mb-xs">Faster Legs (Green)</div>
               <q-linear-progress
                 :value="store.teamPerformanceMetrics.totalLegs > 0 ? store.teamPerformanceMetrics.fasterLegs / store.teamPerformanceMetrics.totalLegs : 0"
                 color="green"
                 size="lg"
               />
             </div>
             <div class="col-12 col-md-6">
               <div class="text-caption q-mb-xs">Slower Legs (Orange)</div>
               <q-linear-progress
                 :value="store.teamPerformanceMetrics.totalLegs > 0 ? store.teamPerformanceMetrics.slowerLegs / store.teamPerformanceMetrics.totalLegs : 0"
                 color="orange"
                 size="lg"
               />
             </div>
           </div>
         </div>
      </q-card-section>
    </q-card>

    <!-- Quick Actions -->
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Quick Actions</div>
        <div v-if="store.isAuthenticated" class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <q-btn
              color="primary"
              icon="edit"
              label="Edit Current Leg"
              class="full-width"
              @click="editCurrentLeg"
              :disable="!currentLeg"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-btn
              color="secondary"
              icon="timer"
              label="Record Time"
              class="full-width"
              @click="recordTime"
              :disable="!currentLeg"
            />
          </div>
        </div>
        <div v-else class="text-center q-pa-md">
          <q-chip
            color="orange"
            text-color="white"
            label="Sign in to access quick actions"
            size="md"
          />
        </div>
      </q-card-section>
    </q-card>


  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import type { Race, Leg } from '../types';

const router = useRouter();
const store = useHoodToCoastStore();
const $q = useQuasar(); // Initialize Quasar

// Race selector - default to upcoming race if no current race is set
const selectedRaceId = ref(store.currentRaceId || getUpcomingRaceId());

// Watch for changes and update store
watch(selectedRaceId, (newValue) => {
  if (newValue) {
    store.setCurrentRace(newValue);
  }
});

// Watch store changes and update local state
watch(() => store.currentRaceId, (newValue) => {
  selectedRaceId.value = newValue;
});

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);
const isMockMode = computed(() => store.isMockMode);
const totalDistance = computed(() => store.totalDistance);
const completedLegs = computed(() => store.completedLegs);
const remainingLegs = computed(() => store.remainingLegs);
const currentLeg = computed(() => store.currentLeg);
const progressPercentage = computed(() => store.progressPercentage);

// Race options for selector
const raceOptions = computed(() => store.races);

// Quick Time Recording State
const completionDate = ref<string | null>(null);
const completionTime = ref<string | null>(null);
const isRecordingTime = ref(false);

// Computed property for display and validation
const completionDateTime = computed(() => {
  if (completionDate.value && completionTime.value) {
    return `${completionDate.value} ${completionTime.value}`;
  }
  return null;
});

// Methods
function getUpcomingRaceId(): string | null {
  if (store.races.length === 0) return null;
  
  const now = new Date();
  const upcomingRaces = store.races.filter(race => new Date(race.date) > now);
  
  if (upcomingRaces.length > 0) {
    // Return the earliest upcoming race
    const sortedUpcoming = upcomingRaces.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sortedUpcoming[0]?.id || null;
  }
  
  // If no upcoming races, return the most recent past race
  const sortedRaces = [...store.races].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sortedRaces[0]?.id || null;
}

function getSelectedRaceName(): string {
  if (!selectedRaceId.value) return '';
  const race = raceOptions.value.find(r => r.id === selectedRaceId.value);
  return race ? race.name : '';
}

function getSelectedRaceDate(): Date | null {
  if (!selectedRaceId.value) return null;
  const race = raceOptions.value.find(r => r.id === selectedRaceId.value);
  return race ? new Date(race.date) : null;
}

function formatDate(date: Date | null): string {
  if (!date) return 'No date';
  return store.formatDateTime(new Date(date), false);
}

function onRaceChange(race: Race) {
  if (race && race.id) {
    const raceId = race.id;
    store.setCurrentRace(raceId);
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'positive';
    case 'Medium': return 'info';
    case 'Hard': return 'warning';
    case 'Very Hard': return 'negative';
    default: return 'grey';
  }
}

function getRunnerName(runnerId?: string): string {
  if (!runnerId) return 'Unassigned';
  const team = currentTeam.value;
  if (!team) return 'Unknown';
  const runner = team.runners.find(r => r.id === runnerId);
  return runner ? runner.name : 'Unknown';
}

function getRunnerPace(runnerId?: string): string {
  if (!runnerId) return 'N/A';
  const team = currentTeam.value;
  if (!team) return 'N/A';
  const runner = team.runners.find(r => r.id === runnerId);
  if (runner) {
    return `${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}`;
  }
  return 'N/A';
}

function formatStartTime(startTime?: Date): string {
  if (!startTime) return 'Not set';
  return store.formatDateTime(new Date(startTime), true);
}

function formatFinishTime(finishTime: Date): string {
  return store.formatDateTime(new Date(finishTime), true);
}

function formatCurrentTimeWithDate(): string {
  const now = new Date();
  return now.toLocaleString('en-US', { 
    month: 'short',
    day: 'numeric',
    hour: 'numeric', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
}

function editCurrentLeg() {
  if (currentLeg.value) {
    void router.push({
      path: '/legs',
      query: { edit: currentLeg.value.id }
    });
  }
}

function recordTime() {
  if (currentLeg.value) {
    void router.push({
      path: '/times',
      query: { leg: currentLeg.value.id }
    });
  }
}

function recordCompletionTime() {
  if (currentLeg.value && completionDate.value && completionTime.value && currentTeam.value) {
    // Parse the AM/PM time format and combine with date
    const timeString = completionTime.value; // e.g., "2:30 PM"
    const parts = timeString.split(' ');
    if (parts.length !== 2) return;
    
    const [timePart, period] = parts;
    if (!timePart || !period) return;
    
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) return;
    
    const [hours, minutes] = timeComponents;
    if (!hours || !minutes) return;
    
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    const dateTimeString = `${completionDate.value}T${hour.toString().padStart(2, '0')}:${minutes}:00`;
    const completionDateTime = new Date(dateTimeString);
    
    store.recordLegCompletionTime(currentLeg.value.id, completionDateTime);
    
    // Reset form
    completionDate.value = null;
    completionTime.value = null;
    
    isRecordingTime.value = true;
    setTimeout(() => {
      isRecordingTime.value = false;
    }, 1000);

    $q.notify({
      message: 'Time recorded successfully!',
      color: 'green',
      icon: 'check_circle',
      position: 'top-right',
      timeout: 2000,
    });
  }
}

function setCurrentTime() {
  const now = new Date();
  completionDate.value = now.toISOString().slice(0, 10); // Format as YYYY-MM-DD
  completionTime.value = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }); // Format as h:mm AM/PM
}

function getPerformanceCardClass(difference: number): string {
  if (difference > 0) {
    return 'bg-orange-1 text-orange-8';
  } else if (difference < 0) {
    return 'bg-green-1 text-green-8';
  }
  return '';
}

function formatTimeDifference(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const remainingMinutes = absMinutes % 60;
  const sign = minutes < 0 ? '-' : '+';
  return `${sign}${hours}h ${remainingMinutes}m`;
}



function getLegPerformanceClass(leg: Leg): string {
  if (store.isLegCompleted(leg)) {
    const comparison = store.getLegTimeComparison(leg);
    if (comparison.differenceMinutes !== null) {
      if (comparison.differenceMinutes > 0) {
        return 'bg-warning-1 text-warning-8';
      } else if (comparison.differenceMinutes < 0) {
        return 'bg-positive-1 text-positive-8';
      }
    }
  }
  return '';
}

function formatLegPerformance(leg: Leg): string {
  if (store.isLegCompleted(leg)) {
    const comparison = store.getLegTimeComparison(leg);
    if (comparison.differenceMinutes !== null) {
      const absDifference = Math.abs(comparison.differenceMinutes);
      const hours = Math.floor(absDifference / 60);
      const remainingMinutes = absDifference % 60;
      const sign = comparison.differenceMinutes < 0 ? '-' : '+';
      return `${sign}${hours}h ${remainingMinutes}m`;
    }
  }
  return 'N/A';
}

function getLegPerformanceMessage(leg: Leg): string {
  if (store.isLegCompleted(leg)) {
    const comparison = store.getLegTimeComparison(leg);
    if (comparison.differenceMinutes !== null) {
      if (comparison.differenceMinutes > 0) {
        return 'Slower than estimated';
      } else if (comparison.differenceMinutes < 0) {
        return 'Faster than estimated';
      } else {
        return 'On pace with estimated';
      }
    }
  }
  return 'Leg not completed';
}





function formatTotalDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
}

function getTotalEstimatedDuration(): number {
  if (!currentTeam.value) return 0;
  return currentTeam.value.legs.reduce((total, leg) => {
    return total + store.getLegBestEstimatedTime(leg);
  }, 0);
}

function getTotalActualDuration(): number {
  if (!currentTeam.value || !currentTeam.value.startTime) return 0;
  
  // Find the last completed leg
  const lastCompletedLeg = [...currentTeam.value.legs]
    .filter(leg => store.isLegCompleted(leg))
    .sort((a, b) => b.order - a.order)[0];
  
  if (!lastCompletedLeg?.timeEntry) return 0;
  
  const startTime = new Date(currentTeam.value.startTime);
  const endTime = new Date(lastCompletedLeg.timeEntry.timestamp);
  return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}


</script>
