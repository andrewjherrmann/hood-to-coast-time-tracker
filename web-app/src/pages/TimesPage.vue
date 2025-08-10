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
                    color="blue"
                    text-color="white"
                    :label="`${time.actualTime} min`"
                    size="sm"
                  />
                </div>
                
                <div class="q-mt-sm">
                  <div class="text-caption">
                    <div><strong>Runner:</strong> {{ time.runner }}</div>
                    <div><strong>Completed:</strong> {{ formatTime(time.timestamp) }}</div>
                    <div v-if="time.notes" class="q-mt-xs">
                      <strong>Notes:</strong> {{ time.notes }}
                    </div>
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
              :options="availableLegs"
              option-label="name"
              option-value="id"
              label="Select Leg"
              outlined
              dense
              :rules="[val => !!val || 'Leg is required']"
            />
            
            <q-input
              v-model="timeForm.runner"
              label="Runner Name"
              outlined
              dense
              :rules="[val => !!val || 'Runner name is required']"
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
              outlined
              dense
              type="textarea"
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
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

// Define the TimeEntry interface locally since it's not exported from the store
interface TimeEntry {
  id: string;
  legId: string;
  runner: string;
  actualTime: number;
  timestamp: Date;
  notes?: string;
}

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
  runner: '',
  actualTime: 0,
  notes: ''
});

// Computed
const sortedTimes = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.times].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
});

const availableLegs = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return team.legs.filter(leg => !leg.completed);
});

// Methods
function getLegName(legId: string): string {
  const team = currentTeam.value;
  if (!team) return 'Unknown Leg';
  const leg = team.legs.find(l => l.id === legId);
  return leg ? leg.name : 'Unknown Leg';
}

function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function editTime(time: TimeEntry) {
  editingTime.value = time;
  timeForm.value = {
    legId: time.legId,
    runner: time.runner,
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
    // For now, delete and recreate since updateTime doesn't exist
    store.deleteTime(editingTime.value.id);
  }
  
  store.addTime({
    legId: timeForm.value.legId,
    runner: timeForm.value.runner,
    actualTime: timeForm.value.actualTime,
    notes: timeForm.value.notes
  });
  
  closeTimeDialog();
}

function closeTimeDialog() {
  showAddTimeDialog.value = false;
  editingTime.value = null;
  timeForm.value = {
    legId: '',
    runner: '',
    actualTime: 0,
    notes: ''
  };
}

// Check if we should edit a specific time (from dashboard navigation)
onMounted(() => {
  const editLegId = route.query.edit as string;
  if (editLegId) {
    const team = currentTeam.value;
    if (team) {
      const time = team.times.find(t => t.legId === editLegId);
      if (time) {
        editTime(time);
      }
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
