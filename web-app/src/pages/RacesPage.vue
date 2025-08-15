<template>
  <q-page padding>
    <div class="row q-mb-lg">
      <div class="col">
        <h4 class="q-mb-sm">Race Management</h4>
        <p class="text-grey-7">Create and manage your races</p>
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
                {{ getSelectedRaceName() }} - {{ getSelectedRaceDate() ? formatDate(getSelectedRaceDate()!) : 'No date' }}
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
            label="New Race"
            @click="showNewRaceDialog = true"
            :disable="store.currentRace?.locked"
          />
        </div>
      </div>
    </div>

    <!-- Race Cards -->
    <div class="row q-gutter-md">
      <q-card
        v-for="race in sortedRaces"
        :key="race.id"
        class="race-card"
        :class="{ 'active-race': race.isActive }"
        style="min-width: 300px;"
      >
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="col">
              <h6 class="q-mb-xs">{{ race.name }}</h6>
              <p class="text-grey-7 q-mb-none">
                {{ formatDate(race.date) }}
              </p>
            </div>
            <q-chip
              v-if="race.isActive"
              color="positive"
              text-color="white"
              size="sm"
              icon="check_circle"
            >
              Active
            </q-chip>
          </div>

          <div class="row q-gutter-sm q-mb-md">
            <q-chip size="sm" icon="people">
              {{ race.team.runners.length }} Runners
            </q-chip>
            <q-chip size="sm" icon="flag">
              {{ race.team.legs.length }} Legs
            </q-chip>
            <q-chip size="sm" icon="timer">
              {{ race.team.legs.filter(leg => store.isLegCompleted(leg)).length }} Completed
            </q-chip>
            <q-chip 
              v-if="race.locked" 
              size="sm" 
              icon="lock" 
              color="warning"
              text-color="white"
            >
              Locked
            </q-chip>
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              v-if="!race.locked"
              size="sm"
              color="primary"
              icon="content_copy"
              label="Duplicate"
              @click="duplicateRace(race)"
            />
            <q-btn
              v-if="!race.locked"
              size="sm"
              color="warning"
              icon="edit"
              label="Edit"
              @click="editRace(race)"
            />
            <q-btn
              v-if="!race.locked"
              size="sm"
              color="negative"
              icon="delete"
              label="Delete"
              @click="confirmDeleteRace(race)"
            />
            <q-btn
              v-if="!race.locked"
              size="sm"
              color="info"
              icon="lock"
              label="Lock"
              @click="lockRace(race)"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- New Race Dialog -->
    <q-dialog v-model="showNewRaceDialog">
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">Create New Race</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="createNewRace" class="q-gutter-md">
            <q-input
              v-model="newRaceForm.name"
              label="Race Name"
              outlined
              dense
              :rules="[val => !!val || 'Race name is required']"
            />

            <q-input
              v-model="newRaceForm.date"
              label="Race Date"
              outlined
              dense
              readonly
              :rules="[val => !!val || 'Race date is required']"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="newRaceForm.date"
                      mask="YYYY-MM-DD"
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>

            <q-input
              v-model="newRaceForm.startTime"
              label="Start Time"
              outlined
              dense
              readonly
              :rules="[val => !!val || 'Start time is required']"
            >
              <template v-slot:append>
                <q-icon name="access_time" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-time
                      v-model="newRaceForm.startTime"
                      mask="hh:mm A"
                      format24h
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>

            <q-input
              v-model="newRaceForm.teamName"
              label="Team Name"
              outlined
              dense
              :rules="[val => !!val || 'Team name is required']"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Create Race"
            color="primary"
            @click="createNewRace"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Duplicate Race Dialog -->
    <q-dialog v-model="showDuplicateDialog">
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">Duplicate Race</div>
          <p class="text-grey-7">
            Create a copy of "{{ raceToDuplicate?.name }}" with new details
          </p>
        </q-card-section>

        <q-card-section>
          <q-form @submit="confirmDuplicateRace" class="q-gutter-md">
            <q-input
              v-model="duplicateForm.name"
              label="New Race Name"
              outlined
              dense
              :rules="[val => !!val || 'Race name is required']"
            />

            <q-input
              v-model="duplicateForm.date"
              label="New Race Date"
              outlined
              dense
              readonly
              :rules="[val => !!val || 'Race date is required']"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="duplicateForm.date"
                      mask="YYYY-MM-DD"
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Duplicate Race"
            color="primary"
            @click="confirmDuplicateRace"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Race Dialog -->
    <q-dialog v-model="showEditDialog">
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">Edit Race</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="confirmEditRace" class="q-gutter-md">
            <q-input
              v-model="editForm.name"
              label="Race Name"
              outlined
              dense
              :rules="[val => !!val || 'Race name is required']"
            />

            <q-input
              v-model="editForm.date"
              label="Race Date"
              outlined
              dense
              type="date"
              :rules="[val => !!val || 'Race date is required']"
            />

            <q-input
              v-model="editForm.teamName"
              label="Team Name"
              outlined
              dense
              :rules="[val => !!val || 'Team name is required']"
            />

            <q-input
              v-model="editForm.startTime"
              label="Start Time"
              outlined
              dense
              type="time"
              :rules="[val => !!val || 'Start time is required']"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Save Changes"
            color="primary"
            @click="confirmEditRace"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete Race</div>
          <p>
            Are you sure you want to delete "{{ raceToDelete?.name }}"? 
            This action cannot be undone.
          </p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="red"
            @click="confirmDeleteRaceAction"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import type { Race } from '../types';
import { useQuasar } from 'quasar';

const store = useHoodToCoastStore();
const $q = useQuasar();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Race selector - default to current race if no race is set
const selectedRaceId = ref(store.currentRaceId || null);

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

// Race options for selector
const raceOptions = computed(() => store.races);

// Computed property for sorted races (newest first)
const sortedRaces = computed(() => {
  return [...store.races].sort((a, b) => new Date(b.date).getTime() - new Date(b.date).getTime());
});

// Dialog states
const showNewRaceDialog = ref(false);
const showDuplicateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);

// Form data
const newRaceForm = reactive({
  name: '',
  date: '',
  teamName: '',
  startTime: ''
});

const duplicateForm = reactive({
  name: '',
  date: ''
});

const editForm = reactive({
  name: '',
  date: '',
  teamName: '',
  startTime: ''
});

// Selected race references
const raceToDuplicate = ref<Race | null>(null);
const raceToEdit = ref<Race | null>(null);
const raceToDelete = ref<Race | null>(null);

// Helper functions
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

function onRaceChange(race: Race) {
  if (race && race.id) {
    const raceId = race.id;
    store.setCurrentRace(raceId);
  }
}

function formatDate(date: Date): string {
  return store.formatDateTime(new Date(date), false);
}

function createNewRace() {
  if (!newRaceForm.name || !newRaceForm.date || !newRaceForm.teamName || !newRaceForm.startTime) {
    $q.notify({
      type: 'negative',
      message: 'Please fill in all required fields'
    });
    return;
  }

  const raceDate = new Date(newRaceForm.date);
  
  // Parse the AM/PM time format (e.g., "2:30 PM")
  const timeString = newRaceForm.startTime;
  const parts = timeString.split(' ');
  if (parts.length !== 2) {
    $q.notify({
      type: 'negative',
      message: 'Invalid time format'
    });
    return;
  }
  
  const [timePart, period] = parts;
  if (!timePart || !period) {
    $q.notify({
      type: 'negative',
      message: 'Invalid time format'
    });
    return;
  }
  
  const timeComponents = timePart.split(':');
  if (timeComponents.length !== 2) {
    $q.notify({
      type: 'negative',
      message: 'Invalid time format'
    });
    return;
  }
  
  const [hours, minutes] = timeComponents;
  if (!hours || !minutes) {
    $q.notify({
      type: 'negative',
      message: 'Invalid time format'
    });
    return;
  }
  
  let hour = parseInt(hours);
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  
  const startTime = new Date(raceDate);
  startTime.setHours(hour, parseInt(minutes), 0, 0);

  const newRace = store.createRace({
    name: newRaceForm.name,
    date: raceDate,
    team: {
      id: `team-${Date.now()}`,
      name: newRaceForm.teamName,
      startTime,
      legs: [],
      
      runners: []
    }
  });

  if (newRace) {
    // Reset form
    Object.assign(newRaceForm, {
      name: '',
      date: '',
      teamName: '',
      startTime: ''
    });

    $q.notify({
      type: 'positive',
      message: 'Race created successfully!'
    });
  }
}

function duplicateRace(race: Race) {
  raceToDuplicate.value = race;
  duplicateForm.name = `${race.name} (Copy)`;
  duplicateForm.date = '';
  showDuplicateDialog.value = true;
}

function lockRace(race: Race) {
  store.lockRace(race.id);
  $q.notify({
    type: 'positive',
    message: 'Race locked successfully!'
  });
}

function confirmDuplicateRace() {
  if (!raceToDuplicate.value || !duplicateForm.name || !duplicateForm.date) {
    $q.notify({
      type: 'negative',
      message: 'Please fill in all required fields'
    });
    return;
  }

  const newDate = new Date(duplicateForm.date);
  const duplicatedRace = store.duplicateRace(
    raceToDuplicate.value.id,
    duplicateForm.name,
    newDate
  );

  if (duplicatedRace) {
    $q.notify({
      type: 'positive',
      message: 'Race duplicated successfully!'
    });
  }
}

function editRace(race: Race) {
  raceToEdit.value = race;
  editForm.name = race.name;
  const dateParts = race.date.toISOString().split('T');
  editForm.date = dateParts[0] || '';
  editForm.teamName = race.team.name;
  
  const startTime = new Date(race.team.startTime);
  editForm.startTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
  
  showEditDialog.value = true;
}

function confirmEditRace() {
  if (!raceToEdit.value || !editForm.name || !editForm.date || !editForm.teamName || !editForm.startTime) {
    $q.notify({
      type: 'negative',
      message: 'Please fill in all required fields'
    });
    return;
  }

  const raceDate = new Date(editForm.date);
  const timeParts = editForm.startTime.split(':');
  if (timeParts.length !== 2) {
    $q.notify({
      type: 'negative',
      message: 'Invalid time format'
    });
    return;
  }
  
  const hours = parseInt(timeParts[0] || '0');
  const minutes = parseInt(timeParts[1] || '0');
  const startTime = new Date(raceDate);
  startTime.setHours(hours, minutes, 0, 0);

  store.updateRace(raceToEdit.value.id, {
    name: editForm.name,
    date: raceDate,
    team: {
      ...raceToEdit.value.team,
      name: editForm.teamName,
      startTime
    }
  });

  $q.notify({
    type: 'positive',
    message: 'Race updated successfully!'
  });
}

function confirmDeleteRace(race: Race) {
  raceToDelete.value = race;
  showDeleteDialog.value = true;
}

function confirmDeleteRaceAction() {
  if (raceToDelete.value) {
    store.deleteRace(raceToDelete.value.id);
    $q.notify({
      type: 'positive',
      message: 'Race deleted successfully!'
    });
  }
}


</script>

<style scoped>
.race-card {
  transition: all 0.3s ease;
}

.race-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.active-race {
  border: 2px solid #21ba45;
  background-color: #f8fff9;
}
</style>
