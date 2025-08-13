<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <h4 class="q-my-none">Manage Times</h4>
      <q-btn
        color="primary"
        icon="add"
        label="Add New Time"
        @click="showAddTimeDialog = true"
      />
    </div>

    <!-- Times List -->
    <q-card>
      <q-card-section>
        <div class="row q-gutter-md">
          <div
            v-for="time in sortedTimes"
            :key="time.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <q-card class="time-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="text-h6">{{ getLegName(time.legId) }}</div>
                  <q-chip
                    color="green"
                    text-color="white"
                    label="Completed"
                    size="sm"
                  />
                </div>
                
                <div class="q-mt-sm">
                  <div class="text-caption text-grey-7">
                    <q-icon name="person" size="xs" class="q-mr-xs" />
                    {{ getRunnerName(time.runnerId) }}
                  </div>
                  <div class="text-caption text-grey-7">
                    <q-icon name="timer" size="xs" class="q-mr-xs" />
                    {{ time.actualTime }} minutes
                  </div>
                  <div class="text-caption text-grey-7">
                    <q-icon name="schedule" size="xs" class="q-mr-xs" />
                    {{ formatTimestamp(time.timestamp) }}
                  </div>
                  <div class="text-caption text-grey-7">
                    <q-icon name="speed" size="xs" class="q-mr-xs" />
                    Est: {{ getEstimatedTime(time.legId) }} min
                  </div>
                </div>

                <div v-if="time.notes" class="q-mt-sm">
                  <q-separator class="q-my-sm" />
                  <div class="text-caption">
                    <strong>Notes:</strong> {{ time.notes }}
                  </div>
                </div>
              </q-card-section>

              <q-card-actions align="right">
                <q-btn
                  flat
                  color="secondary"
                  label="Edit"
                  size="sm"
                  @click="editTime(time)"
                />
                <q-btn
                  flat
                  color="negative"
                  label="Delete"
                  size="sm"
                  @click="confirmDeleteTime(time)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Time Dialog -->
    <q-dialog v-model="showAddTimeDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingTime ? 'Edit Time' : 'Add New Time' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSaveTime" class="q-gutter-md">
            <q-select
              v-model="timeForm.legId"
              :options="legOptions"
              label="Leg"
              outlined
              dense
              emit-value
              map-options
              :rules="[val => !!val || 'Leg is required']"
            />

            <q-select
              v-model="timeForm.runnerId"
              :options="runnerOptions"
              label="Runner"
              outlined
              dense
              emit-value
              map-options
              :rules="[val => !!val || 'Runner is required']"
            />

            <q-input
              v-model.number="timeForm.actualTime"
              label="Actual Time (minutes)"
              type="number"
              outlined
              dense
              :rules="[val => val > 0 || 'Time must be positive']"
            />

            <q-input
              v-model="timeForm.notes"
              label="Notes (optional)"
              type="textarea"
              outlined
              dense
              rows="3"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn
                flat
                label="Cancel"
                color="primary"
                @click="closeTimeDialog"
              />
              <q-btn
                unelevated
                :label="editingTime ? 'Update' : 'Add'"
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
          <span class="q-ml-sm">Are you sure you want to delete this time entry?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="handleDeleteTime"
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
import type { TimeEntry} from '../stores/hood-to-coast-store';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const route = useRoute();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Local state
const showAddTimeDialog = ref(false);
const showDeleteDialog = ref(false);
const editingTime = ref<TimeEntry | null>(null);
const timeToDelete = ref<TimeEntry | null>(null);

const timeForm = ref({
  legId: '',
  runnerId: '',
  actualTime: 0,
  notes: ''
});

// Computed
const sortedTimes = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.times].sort((a, b) => {
    const legA = team.legs.find(l => l.id === a.legId);
    const legB = team.legs.find(l => l.id === b.legId);
    if (legA && legB) {
      return legA.order - legB.order;
    }
    return 0;
  });
});

const legOptions = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  
  return team.legs
    .filter(leg => !leg.isCompleted) // Only show uncompleted legs
    .map(leg => ({
                  label: `Leg ${leg.order} (${leg.distance} mi)`,
      value: leg.id
    }))
    .sort((a, b) => {
      const legA = team.legs.find(l => l.id === a.value);
      const legB = team.legs.find(l => l.id === b.value);
      if (legA && legB) {
        return legA.order - legB.order;
      }
      return 0;
    });
});

const runnerOptions = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  
  return team.runners.map(runner => ({
    label: `${runner.name} (${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}/mi)`,
    value: runner.id
  }));
});

// Methods
function getLegName(legId: string): string {
  const team = currentTeam.value;
  if (!team) return 'Unknown Leg';
  const leg = team.legs.find(l => l.id === legId);
      return leg ? `Leg ${leg.order}` : 'Unknown Leg';
}

function getRunnerName(runnerId: string): string {
  const team = currentTeam.value;
  if (!team) return 'Unknown Runner';
  const runner = team.runners.find(r => r.id === runnerId);
  return runner ? runner.name : 'Unknown Runner';
}

function getEstimatedTime(legId: string): number {
  const team = currentTeam.value;
  if (!team) return 0;
  const leg = team.legs.find(l => l.id === legId);
  if (!leg) return 0;
  return store.getLegBestEstimatedTime(leg);
}

function formatTimestamp(timestamp: Date): string {
  return new Date(timestamp).toLocaleString();
}

function editTime(time: TimeEntry) {
  editingTime.value = time;
  timeForm.value = {
    legId: time.legId,
    runnerId: time.runnerId,
    actualTime: time.actualTime,
    notes: time.notes || ''
  };
  showAddTimeDialog.value = true;
}

function confirmDeleteTime(time: TimeEntry) {
  timeToDelete.value = time;
  showDeleteDialog.value = true;
}

function handleDeleteTime() {
  if (timeToDelete.value) {
    store.deleteTime(timeToDelete.value.id);
    timeToDelete.value = null;
  }
}

function handleSaveTime() {
  if (editingTime.value) {
    // For editing, we need to remove the old time and add the new one
    store.deleteTime(editingTime.value.id);
  }
  
  store.addTime(timeForm.value);
  closeTimeDialog();
}

function closeTimeDialog() {
  showAddTimeDialog.value = false;
  editingTime.value = null;
  timeForm.value = {
    legId: '',
    runnerId: '',
    actualTime: 0,
    notes: ''
  };
}

// Check if we should edit a specific time (from dashboard navigation)
onMounted(() => {
  const editTimeId = route.query.edit as string;
  if (editTimeId) {
    const time = currentTeam.value?.times.find(t => t.id === editTimeId);
    if (time) {
      editTime(time);
    }
  }
});
</script>

<style scoped>
.time-card {
  transition: all 0.3s ease;
}

.time-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
