<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <h4 class="q-my-none">Manage Legs</h4>
      <q-btn
        color="primary"
        icon="add"
        label="Add New Leg"
        @click="showAddLegDialog = true"
      />
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
            :class="store.isLegCompleted(leg) ? 'bg-green-1' : 'bg-grey-1'"
            class="leg-item q-mb-sm"
            draggable="true"
            @dragstart="onDragStart($event, leg)"
            @dragover.prevent
            @drop="onDrop($event, leg)"
            @dragenter.prevent
          >
            <q-item-section avatar>
              <q-avatar
                :color="store.isLegCompleted(leg) ? 'green' : 'grey'"
                text-color="white"
                size="md"
                class="leg-number"
              >
                {{ leg.order }}
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <div class="row q-gutter-sm q-mb-sm">
                <q-chip
                  :color="getDifficultyColor(leg.difficulty)"
                  text-color="white"
                  :label="leg.difficulty"
                  size="sm"
                />
                <q-chip
                  color="blue"
                  text-color="white"
                  :label="`${leg.distance} mi`"
                  size="sm"
                />
                <q-chip
                  color="green"
                  text-color="white"
                  :label="`${store.getLegEstimatedTime(leg)} min`"
                  size="sm"
                />
                <q-chip
                  v-if="store.getLegEstimatedTimeByRunner(leg) && 
                         store.getLegEstimatedTimeByRunner(leg) !== store.getLegEstimatedTime(leg)"
                  color="teal"
                  text-color="white"
                  :label="`${store.getLegEstimatedTimeByRunner(leg)} min (runner)`"
                  size="sm"
                />
                <q-chip
                  :color="store.isLegCompleted(leg) ? 'green' : 'grey'"
                  text-color="white"
                  :label="store.isLegCompleted(leg) ? 'Completed' : 'Pending'"
                  size="sm"
                />
              </div>

              <!-- Runner Assignment -->
              <div class="q-mt-md">
                <q-select
                  v-model="leg.runnerId"
                  :options="runnerOptions"
                  label="Assigned Runner"
                  outlined
                  dense
                  emit-value
                  map-options
                  @update:model-value="(value) => assignRunnerToLeg(leg.id, value)"
                />
              </div>

              <div v-if="store.isLegCompleted(leg)" class="q-mt-sm">
                <q-separator class="q-my-sm" />
                <div class="text-caption">
                  <div>Runner: {{ getRunnerName(leg.runnerId) }}</div>
                  <div>Estimated Time: {{ store.getLegBestEstimatedTime(leg) }} min</div>
                  <div>Actual Time: {{ store.getLegActualTime(leg) }} min</div>
                  <div v-if="getLegPerformanceInfo(leg).hasComparison" 
                       :class="getLegPerformanceInfo(leg).isFaster ? 'text-positive' : 'text-negative'">
                    {{ getLegPerformanceInfo(leg).isFaster ? 'Faster' : 'Slower' }} by 
                    {{ getLegPerformanceInfo(leg).differenceMinutes }} min
                    ({{ getLegPerformanceInfo(leg).percentageDifference }}%)
                  </div>
                </div>
              </div>
            </q-item-section>

            <q-item-section side>
              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  round
                  color="secondary"
                  icon="edit"
                  size="sm"
                  @click="editLeg(leg)"
                />
                <q-btn
                  flat
                  round
                  color="negative"
                  icon="delete"
                  size="sm"
                  @click="confirmDeleteLeg(leg)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Leg Dialog -->
    <q-dialog v-model="showAddLegDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingLeg ? 'Edit Leg' : 'Add New Leg' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSaveLeg" class="q-gutter-md">
            <q-input
              v-model="legForm.description"
              label="Description (optional)"
              outlined
              dense
              type="textarea"
              rows="2"
              placeholder="Brief description of the leg route or terrain..."
            />
            
            <div class="row q-gutter-md">
              <q-input
                v-model.number="legForm.distance"
                label="Distance (miles)"
                type="number"
                step="0.1"
                outlined
                dense
                class="col"
                :rules="[val => val > 0 || 'Distance must be positive']"
              />
              
              <q-select
                v-model="legForm.difficulty"
                :options="difficultyOptions"
                label="Difficulty"
                outlined
                dense
                class="col"
                :rules="[val => !!val || 'Difficulty is required']"
              />
            </div>
            
            <div class="row q-gutter-md">
              <q-input
                v-model.number="legForm.estimatedPaceMinutes"
                label="Estimated Pace (minutes per mile)"
                type="number"
                outlined
                dense
                class="col"
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
                class="col"
                min="0"
                max="59"
                :rules="[val => val >= 0 || 'Seconds must be 0-59']"
              />
            </div>

            <q-select
              v-model="legForm.difficulty"
              :options="difficultyOptions"
              label="Difficulty"
              outlined
              dense
              :rules="[val => !!val || 'Difficulty is required']"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn
                flat
                label="Cancel"
                color="primary"
                @click="closeLegDialog"
              />
              <q-btn
                unelevated
                :label="editingLeg ? 'Update' : 'Add'"
                color="primary"
                type="submit"
              />
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import type { Leg } from '../types';

const route = useRoute();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Drag and drop state
const draggedLeg = ref<Leg | null>(null);

// Local state
const showAddLegDialog = ref(false);
const showDeleteDialog = ref(false);
const editingLeg = ref<Leg | null>(null);
const legToDelete = ref<Leg | null>(null);

const legForm = ref({
  description: '',
  distance: 0,
  difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard' | 'Very Hard',
  estimatedPaceMinutes: 8,
  estimatedPaceSeconds: 30
});

const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Very Hard'];

// Computed
const sortedLegs = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.legs].sort((a, b) => a.order - b.order);
});

const runnerOptions = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  
  return [
    { label: 'No Runner Assigned', value: undefined, pace: 'N/A' },
    ...team.runners.map(runner => ({
      label: runner.name,
      value: runner.id,
      pace: `${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}`
    }))
  ];
});

// Methods
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'green';
    case 'Medium': return 'blue';
    case 'Hard': return 'orange';
    case 'Very Hard': return 'red';
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

function assignRunnerToLeg(legId: string, runnerId: string | undefined) {
  store.assignRunnerToLeg(legId, runnerId);
}

function editLeg(leg: Leg) {
  editingLeg.value = leg;
  legForm.value = {
    description: leg.description || '',
    distance: leg.distance,
    difficulty: leg.difficulty,
    estimatedPaceMinutes: leg.estimatedPaceMinutes,
    estimatedPaceSeconds: leg.estimatedPaceSeconds
  };
  showAddLegDialog.value = true;
}

function confirmDeleteLeg(leg: Leg) {
  legToDelete.value = leg;
  showDeleteDialog.value = true;
}

function handleDeleteLeg() {
  if (legToDelete.value) {
    store.deleteLeg(legToDelete.value.id);
    legToDelete.value = null;
  }
}

function handleSaveLeg() {
  if (editingLeg.value) {
    store.updateLeg(editingLeg.value.id, legForm.value);
  } else {
    store.addLeg(legForm.value);
  }
  
  closeLegDialog();
}

function closeLegDialog() {
  showAddLegDialog.value = false;
  editingLeg.value = null;
  legForm.value = {
    description: '',
    distance: 0,
    difficulty: 'Medium',
    estimatedPaceMinutes: 8,
    estimatedPaceSeconds: 30
  };
}

// Drag and drop functions
function onDragStart(event: DragEvent, leg: Leg) {
  draggedLeg.value = leg;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDrop(event: DragEvent, targetLeg: Leg) {
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
  store.reorderLegs(currentOrder);
  
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
</style>
