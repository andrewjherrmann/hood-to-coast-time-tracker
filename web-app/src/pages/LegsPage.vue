<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="!store.isInitialized" class="text-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
      <div class="text-h6 q-mt-md">Loading Legs...</div>
      <div class="text-caption text-grey-6 q-mt-sm">Please wait while we load your race data</div>
    </div>

    <!-- Legs Content -->
    <div v-else>
      <!-- Header -->
      <div class="row items-center justify-between q-mb-lg">
      <div class="col">
        <h4 class="q-my-none">Manage Legs</h4>
        <p class="q-mt-sm q-mb-none text-grey-7">
          {{ currentTeam?.name || 'No team selected' }}
        </p>
      </div>
      <div class="col-auto">
        <div class="row q-gutter-md items-center">
          <!-- Race Selector -->
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
          
          <!-- Locked Indicator -->
          <q-chip
            v-if="store.currentRace?.locked"
            color="warning"
            text-color="white"
            icon="lock"
            label="Race Locked"
            size="md"
          />
          
          <q-btn
            color="primary"
            icon="add"
            label="Add New Leg"
            @click="showAddLegDialog = true"
            :disable="store.currentRace?.locked"
          />
        </div>
      </div>
    </div>

    <!-- Legs List -->
    <q-card>
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">
          Drag and drop legs to reorder them. The order determines the sequence of the race.
        </div>
        
        <q-list separator>
          <q-item
            v-for="leg in sortedLegs"
            :key="leg.id"
            :class="store.isLegCompleted(leg) ? 'bg-positive-1' : 'bg-grey-1'"
            class="leg-item q-mb-sm"
            draggable="true"
            @dragstart="onDragStart($event, leg)"
            @dragover.prevent
            @drop="onDrop($event, leg)"
            @dragenter.prevent
          >
            <q-item-section avatar>
              <q-avatar
                :color="store.isLegCompleted(leg) ? 'positive' : 'grey'"
                text-color="white"
                size="md"
                class="leg-number"
              >
                {{ leg.order }}
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <!-- Header with chips and action buttons -->
              <div class="row q-gutter-sm q-mb-sm items-center justify-between">
                <div class="row q-gutter-sm">
                  <q-chip
                    :color="getDifficultyColor(leg.difficulty)"
                    text-color="white"
                    :label="leg.difficulty"
                    size="sm"
                  />
                  <q-chip
                    color="primary"
                    text-color="white"
                    :label="`${leg.distance} mi`"
                    size="sm"
                  />
                  <q-chip
                    color="secondary"
                    text-color="white"
                    :label="`${store.getLegEstimatedTime(leg)} min`"
                    size="sm"
                  />
                  <q-chip
                    v-if="store.getLegEstimatedTimeByRunner(leg) && 
                           store.getLegEstimatedTimeByRunner(leg) !== store.getLegEstimatedTime(leg)"
                    color="accent"
                    text-color="white"
                    :label="`${store.getLegEstimatedTime(leg)} min (runner)`"
                    size="sm"
                  />
                  <q-chip
                    :color="store.isLegCompleted(leg) ? 'positive' : 'grey'"
                    text-color="white"
                    :label="store.isLegCompleted(leg) ? 'Completed' : 'Pending'"
                    size="sm"
                  />
                </div>
                
                <!-- Action buttons moved to top right -->
                <div class="row q-gutter-sm">
                  <q-btn
                    flat
                    round
                    color="secondary"
                    icon="edit"
                    size="sm"
                    @click="editLeg(leg)"
                    :disable="store.currentRace?.locked"
                    title="Edit leg"
                  />
                  <q-btn
                    flat
                    round
                    color="negative"
                    icon="delete"
                    size="sm"
                    @click="confirmDeleteLeg(leg)"
                    :disable="store.currentRace?.locked"
                    title="Delete leg"
                  />
                </div>
              </div>

              <!-- Assigned Runner Display -->
              <div class="q-mt-md">
                <div class="text-caption text-grey-6">Assigned Runner</div>
                <div class="text-body2 q-mb-xs">
                  {{ getAssignedRunnerName(leg) || 'No runner assigned' }}
                </div>
                <div v-if="store.isLegCompleted(leg)" class="text-caption text-grey-6">
                  Runner assignment is locked for completed legs
                </div>
              </div>

              <div v-if="store.isLegCompleted(leg)" class="q-mt-sm">
                <q-separator class="q-my-sm" />
                <div class="text-caption">
                  <div class="row q-gutter-md">
                    <div class="col-12 col-sm-6">
                      <div><strong>Runner:</strong> {{ getRunnerName(leg.runnerId) }}</div>
                      <div><strong>Estimated Time:</strong> {{ store.getLegBestEstimatedTime(leg) }} min</div>
                      <div><strong>Actual Duration:</strong> {{ store.getLegActualDuration(leg) }} min</div>
                    </div>
                    <div class="col-12 col-sm-6">
                      <div v-if="getLegPerformanceInfo(leg).hasComparison" 
                           :class="getLegPerformanceInfo(leg).isFaster ? 'text-positive' : 'text-negative'">
                        <strong>{{ getLegPerformanceInfo(leg).isFaster ? 'Faster' : 'Slower' }} by 
                        {{ getLegPerformanceInfo(leg).differenceMinutes }} min</strong><br>
                        <span class="text-grey-7">({{ getLegPerformanceInfo(leg).percentageDifference }}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Time Information -->
              <div class="q-mt-sm">
                <q-separator class="q-my-sm" />
                <div class="text-caption">
                  <div class="row q-gutter-md">
                    <div class="col-12 col-sm-6">
                      <strong>Start Time:</strong><br>
                      <span class="text-grey-7">
                        {{ formatTime(store.getLegStartTime(leg)) }}
                      </span>
                    </div>
                    <div class="col-12 col-sm-6">
                      <strong>End Time:</strong><br>
                      <span class="text-grey-7">
                        {{ formatTime(store.getLegEndTime(leg)) }}
                      </span>
                    </div>
                  </div>
                  <div class="q-mt-xs">
                    <strong>Duration:</strong> 
                    <span class="text-grey-7">
                      {{ store.getLegDuration(leg) }} min
                    </span>
                  </div>
                </div>
              </div>

              <!-- Completion Time Management -->
              <div v-if="store.isLegCompleted(leg)" class="q-mt-sm">
                <q-separator class="q-my-sm" />
                <div class="text-caption">
                  <div class="row q-gutter-md items-center justify-between">
                    <div class="col">
                      <strong>Completion Time:</strong><br>
                      <span class="text-grey-7">
                        {{ formatTime(store.getLegEndTime(leg)) }}
                      </span>
                    </div>
                    <div class="row q-gutter-sm">
                      <q-btn
                        flat
                        round
                        color="warning"
                        icon="edit"
                        size="sm"
                        @click="editCompletionTime(leg)"
                        :disable="store.currentRace?.locked"
                        title="Edit completion time"
                      />
                      <q-btn
                        flat
                        round
                        color="negative"
                        icon="delete"
                        size="sm"
                        @click="confirmRemoveCompletionTime(leg)"
                        :disable="store.currentRace?.locked"
                        title="Remove completion time"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Record Completion Time -->
              <div v-else-if="store.isAuthenticated" class="q-mt-sm">
                <q-separator class="q-my-sm" />
                <div class="text-caption">
                  <div class="row q-gutter-md items-center justify-between">
                    <div class="col">
                      <strong>Status:</strong><br>
                      <span class="text-grey-7">Not completed</span>
                    </div>
                    <div>
                      <q-btn
                        flat
                        round
                        color="positive"
                        icon="timer"
                        size="sm"
                        @click="recordCompletionTime(leg)"
                        :disable="store.currentRace?.locked"
                        title="Record completion time"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </q-item-section>


          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Leg Dialog -->
    <q-dialog v-model="showAddLegDialog" persistent>
      <q-card style="min-width: 300px; max-width: 90vw; width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingLeg ? 'Edit Leg' : 'Add New Leg' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSaveLeg">
            <q-input
              v-model="legForm.description"
              label="Description (optional)"
              outlined
              dense
              type="textarea"
              rows="2"
              placeholder="Brief description of the leg route or terrain..."
              class="q-mb-md"
            />
            
            <div class="row">
              <q-input
                v-model.number="legForm.distance"
                label="Distance (miles)"
                type="number"
                step="0.1"
                outlined
                dense
                class="col-12 col-md-6 q-pr-md"
                :rules="[val => val > 0 || 'Distance must be positive']"
              />
              
              <q-select
                v-model="legForm.difficulty"
                label="Difficulty"
                :options="difficultyOptions"
                outlined
                dense
                class="col-12 col-md-6 q-pl-md"
                :rules="[val => !!val || 'Difficulty is required']"
              />
            </div>

            <RunnerSelector
              v-model="legForm.runnerId"
              :runners="currentTeam?.runners || []"
              label="Assigned Runner"
              placeholder="Select a runner for this leg..."
              @runner-selected="onRunnerSelected"
              class="q-mb-md"
            />
            <!-- Debug info -->
            <div v-if="!currentTeam?.runners?.length" class="text-caption text-grey-6 q-mt-xs">
              No runners available. Add runners first in the Runners page.
            </div>
            <div v-else class="text-caption text-grey-6 q-mt-xs">
              {{ currentTeam.runners.length }} runner(s) available
              <br>
              <small>Team: {{ currentTeam?.name || 'Unknown' }}</small>
            </div>
            
            <div class="row">
              <q-input
                v-model.number="legForm.estimatedPaceMinutes"
                label="Estimated Pace (minutes per mile)"
                type="number"
                outlined
                dense
                class="col-12 col-md-6 q-pr-md"
                min="0"
                max="59"
                :rules="[val => val >= 0 || 'Minutes must be 0 or greater']"
              />
              
              <q-input
                v-model.number="legForm.estimatedPaceSeconds"
                label="Estimated Pace (seconds per mile)"
                type="number"
                outlined
                dense
                class="col-12 col-md-6 q-pl-md"
                min="0"
                max="59"
                :rules="[val => val >= 0 || 'Seconds must be 0-59']"
              />
            </div>

            <div class="row q-mt-md">
              <div class="col-12 col-md-6 q-pr-md">
                <q-btn
                  flat
                  label="Cancel"
                  color="primary"
                  @click="closeLegDialog"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-md-6 q-pl-md">
                <q-btn
                  unelevated
                  :label="editingLeg ? 'Update' : 'Add'"
                  color="primary"
                  type="submit"
                  class="full-width"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Are you sure you want to delete this leg?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="handleDeleteLeg"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Completion Time Dialog -->
    <q-dialog v-model="showCompletionTimeDialog" persistent>
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">{{ editingCompletionTime?.timeEntry ? 'Edit Completion Time' : 'Record Completion Time' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSaveCompletionTime" class="q-gutter-md q-pl-md">
            <DateInput
              v-model="completionTimeForm.date"
              label="Completion Date"
            />

            <TimeInput
              v-model="completionTimeForm.time"
              label="Completion Time"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn
                flat
                label="Cancel"
                color="primary"
                @click="closeCompletionTimeDialog"
              />
                              <q-btn
                  unelevated
                  :label="editingCompletionTime?.timeEntry ? 'Update Time' : 'Record Time'"
                  color="primary"
                  type="submit"
                />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Remove Completion Time Confirmation Dialog -->
    <q-dialog v-model="showRemoveCompletionDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">
            Are you sure you want to remove the completion time for this leg? 
            This will mark the leg as incomplete.
          </span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Remove"
            color="warning"
            @click="handleRemoveCompletionTime"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
      </div> <!-- Close legs content div -->
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import type { Leg, Race, Runner } from '../types';
import DateInput from '../components/DateInput.vue';
import TimeInput from '../components/TimeInput.vue';
import RunnerSelector from '../components/RunnerSelector.vue';

const route = useRoute();
const $q = useQuasar();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Race selector - default to current race if no race is set
const selectedRaceId = ref(store.currentRaceId || getUpcomingRaceId());

// Watch for changes and update store
watch(selectedRaceId, async (newValue) => {
  if (newValue) {
    try {
      await store.setCurrentRace(newValue);
    } catch (error) {
      console.error('Failed to set current race:', error);
    }
  }
});

// Watch store changes and update local state
watch(() => store.currentRaceId, (newValue) => {
  selectedRaceId.value = newValue;
});

// Watch for races being loaded and auto-select the most recent race if none is selected
watch(() => store.races, (newRaces) => {
  if (newRaces.length > 0 && !selectedRaceId.value) {
    const mostRecentRaceId = getUpcomingRaceId();
    if (mostRecentRaceId) {
      selectedRaceId.value = mostRecentRaceId;
    }
  }
}, { immediate: true });

// Race options for selector
const raceOptions = computed(() => store.races);

// Drag and drop state
const draggedLeg = ref<Leg | null>(null);

// Local state
const showAddLegDialog = ref(false);
const showDeleteDialog = ref(false);
const editingLeg = ref<Leg | null>(null);
const legToDelete = ref<Leg | null>(null);

// Completion time management state
const showCompletionTimeDialog = ref(false);
const showRemoveCompletionDialog = ref(false);
const editingCompletionTime = ref<Leg | null>(null);
const legToRemoveCompletion = ref<Leg | null>(null);

const completionTimeForm = ref({
  date: '',
  time: ''
});

const legForm = ref({
  description: '',
  distance: 0,
  difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard' | 'Very Hard',
  estimatedPaceMinutes: 8,
  estimatedPaceSeconds: 30,
  runnerId: undefined as string | undefined
});

const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Very Hard'];

// Computed
const sortedLegs = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.legs].sort((a, b) => a.order - b.order);
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

async function onRaceChange(race: Race) {
  if (race && race.id) {
    const raceId = race.id;
    try {
      await store.setCurrentRace(raceId);
    } catch (error) {
      console.error('Failed to set current race:', error);
    }
  }
}

function formatTime(date: Date | null): string {
  if (!date) return 'Not available';
  return store.formatDateTime(date, true);
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
  console.log('Looking for runner:', runnerId, 'in team:', team.runners);
  const runner = team.runners.find(r => r.id === runnerId);
  return runner ? runner.name : 'Unknown';
}

function getAssignedRunnerName(leg: Leg): string {
  return getRunnerName(leg.runnerId);
}

function getLegPerformanceInfo(leg: Leg) {
  const comparison = store.getLegTimeComparison(leg);
  if (comparison.differenceMinutes === null) {
    return {
      hasComparison: false,
      isFaster: false,
      differenceMinutes: 0,
      percentageDifference: 0
    };
  }
  
  return {
    hasComparison: true,
    isFaster: comparison.isFaster || false,
    differenceMinutes: Math.abs(comparison.differenceMinutes),
    percentageDifference: Math.abs(comparison.percentageDifference || 0)
  };
}



function editLeg(leg: Leg) {
  editingLeg.value = leg;
  legForm.value = {
    description: leg.description || '',
    distance: leg.distance,
    difficulty: leg.difficulty,
    estimatedPaceMinutes: leg.estimatedPaceMinutes,
    estimatedPaceSeconds: leg.estimatedPaceSeconds,
    runnerId: leg.runnerId
  };
  showAddLegDialog.value = true;
}

function confirmDeleteLeg(leg: Leg) {
  legToDelete.value = leg;
  showDeleteDialog.value = true;
}

async function handleDeleteLeg() {
  if (legToDelete.value) {
    try {
      await store.deleteLeg(legToDelete.value.id);
      legToDelete.value = null;
    } catch (error) {
      console.error('Failed to delete leg:', error);
    }
  }
}

async function handleSaveLeg() {
  try {
    // Create a clean leg object without undefined values
    const legData = {
      description: legForm.value.description,
      distance: legForm.value.distance,
      difficulty: legForm.value.difficulty,
      estimatedPaceMinutes: legForm.value.estimatedPaceMinutes,
      estimatedPaceSeconds: legForm.value.estimatedPaceSeconds,
      ...(legForm.value.runnerId && { runnerId: legForm.value.runnerId })
    };

    if (editingLeg.value) {
      await store.updateLeg(editingLeg.value.id, legData);
    } else {
      await store.addLeg(legData);
    }

    closeLegDialog();
  } catch (error) {
    console.error('Failed to save leg:', error);
  }
}

function onRunnerSelected(runner: Runner | undefined) {
  console.log('Runner selected:', runner);
  if (runner) {
    // Auto-populate leg times based on runner's estimated pace
    console.log('Setting pace:', runner.estimatedPaceMinutes, runner.estimatedPaceSeconds);
    legForm.value.estimatedPaceMinutes = runner.estimatedPaceMinutes;
    legForm.value.estimatedPaceSeconds = runner.estimatedPaceSeconds;
  }
}



function closeLegDialog() {
  showAddLegDialog.value = false;
  editingLeg.value = null;
  legForm.value = {
    description: '',
    distance: 0,
    difficulty: 'Medium',
    estimatedPaceMinutes: 8,
    estimatedPaceSeconds: 30,
    runnerId: undefined
  };
}

// Drag and drop functions
function onDragStart(event: DragEvent, leg: Leg) {
  draggedLeg.value = leg;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

async function onDrop(event: DragEvent, targetLeg: Leg) {
  event.preventDefault();
  
  if (!draggedLeg.value || draggedLeg.value.id === targetLeg.id) {
    return;
  }
  
  // Get current order of legs
  const currentOrder = sortedLegs.value.map(leg => leg.id);
  
  // Find positions of dragged and target legs
  const draggedIndex = currentOrder.indexOf(draggedLeg.value.id);
  const targetIndex = currentOrder.indexOf(targetLeg.id);
  
  // Remove dragged leg from its current position
  currentOrder.splice(draggedIndex, 1);
  
  // Insert dragged leg at target position
  currentOrder.splice(targetIndex, 0, draggedLeg.value.id);
  
  // Update the order in the store
  try {
    await store.reorderLegs(currentOrder);
  } catch (error) {
    console.error('Failed to reorder legs:', error);
  }
  
  // Reset dragged leg
  draggedLeg.value = null;
}

// Check if we should edit a specific leg (from dashboard navigation)
onMounted(() => {
  const editLegId = route.query.edit as string;
  if (editLegId) {
    const leg = currentTeam.value?.legs.find(l => l.id === editLegId);
    if (leg) {
      editLeg(leg);
    }
  }
});



// Completion time management
function recordCompletionTime(leg: Leg) {
  editingCompletionTime.value = leg;
  const now = new Date();
  completionTimeForm.value = {
    date: `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`,
    time: now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  };
  showCompletionTimeDialog.value = true;
}

function editCompletionTime(leg: Leg) {
  editingCompletionTime.value = leg;
  if (leg.timeEntry?.timestamp) {
    const timestamp = leg.timeEntry.timestamp;
    completionTimeForm.value = {
      date: `${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear()}`,
      time: timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  } else {
    completionTimeForm.value = {
      date: '',
      time: ''
    };
  }
  showCompletionTimeDialog.value = true;
}

function confirmRemoveCompletionTime(leg: Leg) {
  legToRemoveCompletion.value = leg;
  showRemoveCompletionDialog.value = true;
}

async function handleSaveCompletionTime() {
  if (editingCompletionTime.value && completionTimeForm.value.date && completionTimeForm.value.time) {
    // Parse the M/D/YYYY date format
    const dateParts = completionTimeForm.value.date.split('/');
    if (dateParts.length !== 3) return;
    
    const monthStr = dateParts[0];
    const dayStr = dateParts[1];
    const yearStr = dateParts[2];
    
    if (!monthStr || !dayStr || !yearStr) return;
    
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    const year = parseInt(yearStr);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return;
    
    // Parse the h:mm AM/PM time format
    const timeString = completionTimeForm.value.time;
    const parts = timeString.split(' ');
    if (parts.length !== 2) return;
    
    const timePart = parts[0];
    const period = parts[1];
    
    if (!timePart || !period) return;
    
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) return;
    
    const hoursStr = timeComponents[0];
    const minutesStr = timeComponents[1];
    
    if (!hoursStr || !minutesStr) return;
    
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    if (isNaN(hours) || isNaN(minutes)) return;
    
    let hour = hours;
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    // Create ISO string with proper formatting
    const dateTimeString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const completionDateTime = new Date(dateTimeString);
    
    if (editingCompletionTime.value.timeEntry) {
      // Update existing completion time
      try {
        await store.updateLegCompletionTime(editingCompletionTime.value.id, completionDateTime);
      } catch (error) {
        console.error('Failed to update completion time:', error);
        $q.notify({
          message: 'Failed to update completion time. Please try again.',
          color: 'negative',
          icon: 'error',
          position: 'top-right',
          timeout: 3000,
        });
        return;
      }
      $q.notify({
        message: 'Completion time updated successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top-right',
        timeout: 2000,
      });
    } else {
      // Record new completion time
      try {
        await store.recordLegCompletionTime(editingCompletionTime.value.id, completionDateTime);
      } catch (error) {
        console.error('Failed to record completion time:', error);
        $q.notify({
          message: 'Failed to record completion time. Please try again.',
          color: 'negative',
          icon: 'error',
          position: 'top-right',
          timeout: 3000,
        });
        return;
      }
      $q.notify({
        message: 'Completion time recorded successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top-right',
        timeout: 2000,
      });
    }
    
    closeCompletionTimeDialog();
  }
}

async function handleRemoveCompletionTime() {
  if (legToRemoveCompletion.value) {
    try {
      await store.removeLegCompletionTime(legToRemoveCompletion.value.id);
      legToRemoveCompletion.value = null;
      
      $q.notify({
        message: 'Completion time removed successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top-right',
        timeout: 2000,
      });
    } catch (error) {
      console.error('Failed to remove completion time:', error);
      $q.notify({
        message: 'Failed to remove completion time. Please try again.',
        color: 'negative',
        icon: 'error',
        position: 'top-right',
        timeout: 3000,
      });
    }
  }
}

function closeCompletionTimeDialog() {
  showCompletionTimeDialog.value = false;
  editingCompletionTime.value = null;
  completionTimeForm.value = {
    date: '',
    time: ''
  };
}
</script>

<style scoped>
.leg-item {
  transition: all 0.3s ease;
  border-radius: 8px;
  cursor: grab;
}

.leg-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.leg-item:active {
  cursor: grabbing;
}

.leg-number {
  font-weight: bold;
  font-size: 1.2em;
}

.leg-item[dragover] {
  background-color: rgba(0, 0, 0, 0.05);
  border: 2px dashed #1976d2;
}

/* Responsive padding - hide on mobile, show on desktop */
@media (max-width: 767px) {
  .q-pr-md {
    padding-right: 0 !important;
  }
  .q-pl-md {
    padding-left: 0 !important;
  }
}
</style>
