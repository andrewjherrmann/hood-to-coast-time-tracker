<template>
  <q-page padding>
    <div class="row q-mb-lg">
      <div class="col">
        <h4 class="q-mb-sm">Race Management</h4>
        <p class="text-grey-7">Create and manage your races</p>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="add"
          label="New Race"
          @click="showNewRaceDialog = true"
        />
      </div>
    </div>

    <!-- Race Cards -->
    <div class="row q-gutter-md">
      <q-card
        v-for="race in store.races"
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
              color="green"
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
              {{ race.team.times.length }} Times
            </q-chip>
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              v-if="!race.isActive"
              size="sm"
              color="green"
              icon="play_arrow"
              label="Activate"
              @click="activateRace(race.id)"
            />
            <q-btn
              size="sm"
              color="primary"
              icon="content_copy"
              label="Duplicate"
              @click="duplicateRace(race)"
            />
            <q-btn
              size="sm"
              color="orange"
              icon="edit"
              label="Edit"
              @click="editRace(race)"
            />
            <q-btn
              size="sm"
              color="red"
              icon="delete"
              label="Delete"
              @click="confirmDeleteRace(race)"
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
              type="date"
              :rules="[val => !!val || 'Race date is required']"
            />

            <q-input
              v-model="newRaceForm.teamName"
              label="Team Name"
              outlined
              dense
              :rules="[val => !!val || 'Team name is required']"
            />

            <q-input
              v-model="newRaceForm.startTime"
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
              type="date"
              :rules="[val => !!val || 'Race date is required']"
            />
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
import { ref, reactive } from 'vue';
import { useHoodToCoastStore, type Race } from '../stores/hood-to-coast-store';
import { useQuasar } from 'quasar';

const store = useHoodToCoastStore();
const $q = useQuasar();

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
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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
  const timeParts = newRaceForm.startTime.split(':');
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

  const newRace = store.createRace({
    name: newRaceForm.name,
    date: raceDate,
    team: {
      id: `team-${Date.now()}`,
      name: newRaceForm.teamName,
      startTime,
      legs: [],
      times: [],
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

function activateRace(raceId: string) {
  store.setActiveRace(raceId);
  store.setCurrentRace(raceId);
  $q.notify({
    type: 'positive',
    message: 'Race activated successfully!'
  });
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
