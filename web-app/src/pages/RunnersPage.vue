<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <h4 class="q-my-none">Manage Runners</h4>
      <q-btn
        color="primary"
        icon="add"
        label="Add New Runner"
        @click="showAddRunnerDialog = true"
      />
    </div>

    <!-- Runners List -->
    <q-card>
      <q-card-section>
        <div class="row q-gutter-md">
          <div
            v-for="runner in sortedRunners"
            :key="runner.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <q-card class="runner-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="text-h6">{{ runner.name }}</div>
                  <q-btn
                    flat
                    round
                    icon="more_vert"
                    size="sm"
                  >
                    <q-menu>
                      <q-list style="min-width: 150px">
                        <q-item clickable v-close-popup @click="editRunner(runner)">
                          <q-item-section>Edit</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="confirmDeleteRunner(runner)">
                          <q-item-section class="text-negative">Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
                
                <div class="q-mt-sm">
                  <div class="text-caption text-grey-7">
                    <q-icon name="email" size="xs" class="q-mr-xs" />
                    {{ runner.email }}
                  </div>
                  <div class="text-caption text-grey-7">
                    <q-icon name="phone" size="xs" class="q-mr-xs" />
                    {{ runner.phone }}
                  </div>
                </div>

                <div class="q-mt-md">
                  <q-chip
                    color="blue"
                    text-color="white"
                    :label="`${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')} / mile`"
                    size="sm"
                  />
                </div>

                <!-- Assigned Legs -->
                <div v-if="getAssignedLegs(runner.id).length > 0" class="q-mt-md">
                  <q-separator class="q-my-sm" />
                  <div class="text-caption text-grey-8">
                    <strong>Assigned Legs:</strong>
                  </div>
                  <div class="q-mt-xs">
                    <q-chip
                      v-for="leg in getAssignedLegs(runner.id)"
                      :key="leg.id"
                      :color="leg.completed ? 'green' : 'blue'"
                      text-color="white"
                      :label="`Leg ${leg.order} (${leg.distance} mi)`"
                      size="xs"
                      class="q-mr-xs q-mb-xs"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Runner Dialog -->
    <q-dialog v-model="showAddRunnerDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingRunner ? 'Edit Runner' : 'Add New Runner' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSaveRunner" class="q-gutter-md">
            <q-input
              v-model="runnerForm.name"
              label="Runner Name"
              outlined
              dense
              :rules="[val => !!val || 'Name is required']"
            />
            
            <q-input
              v-model="runnerForm.email"
              label="Email"
              type="email"
              outlined
              dense
              :rules="[
                val => !!val || 'Email is required',
                val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
              ]"
            />

            <q-input
              v-model="runnerForm.phone"
              label="Phone"
              outlined
              dense
              :rules="[val => !!val || 'Phone is required']"
            />

            <div class="row q-gutter-md">
              <q-input
                v-model.number="runnerForm.estimatedPaceMinutes"
                label="Pace (minutes)"
                type="number"
                min="0"
                max="59"
                outlined
                dense
                class="col"
                :rules="[val => val >= 0 || 'Minutes must be 0 or greater']"
              />
              
              <q-input
                v-model.number="runnerForm.estimatedPaceSeconds"
                label="Pace (seconds)"
                type="number"
                min="0"
                max="59"
                outlined
                dense
                class="col"
                :rules="[val => val >= 0 && val < 60 || 'Seconds must be 0-59']"
              />
            </div>

            <div class="row justify-end q-gutter-sm">
              <q-btn
                flat
                label="Cancel"
                color="primary"
                @click="closeRunnerDialog"
              />
              <q-btn
                unelevated
                :label="editingRunner ? 'Update' : 'Add'"
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
          <span class="q-ml-sm">Are you sure you want to delete this runner?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="handleDeleteRunner"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useHoodToCoastStore, type Runner, type Leg } from '../stores/hood-to-coast-store';

const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Local state
const showAddRunnerDialog = ref(false);
const showDeleteDialog = ref(false);
const editingRunner = ref<Runner | null>(null);
const runnerToDelete = ref<Runner | null>(null);

const runnerForm = ref({
  name: '',
  email: '',
  phone: '',
  estimatedPaceMinutes: 8,
  estimatedPaceSeconds: 0
});

// Computed
const sortedRunners = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.runners].sort((a, b) => a.name.localeCompare(b.name));
});

// Methods
function getAssignedLegs(runnerId: string): Leg[] {
  const team = currentTeam.value;
  if (!team) return [];
  return team.legs.filter(leg => leg.runnerId === runnerId);
}

function editRunner(runner: Runner) {
  editingRunner.value = runner;
  runnerForm.value = {
    name: runner.name,
    email: runner.email,
    phone: runner.phone,
    estimatedPaceMinutes: runner.estimatedPaceMinutes,
    estimatedPaceSeconds: runner.estimatedPaceSeconds
  };
  showAddRunnerDialog.value = true;
}

function confirmDeleteRunner(runner: Runner) {
  runnerToDelete.value = runner;
  showDeleteDialog.value = true;
}

function handleDeleteRunner() {
  if (runnerToDelete.value) {
    store.deleteRunner(runnerToDelete.value.id);
    runnerToDelete.value = null;
  }
}

function handleSaveRunner() {
  if (editingRunner.value) {
    store.updateRunner(editingRunner.value.id, runnerForm.value);
  } else {
    store.addRunner(runnerForm.value);
  }
  
  closeRunnerDialog();
}

function closeRunnerDialog() {
  showAddRunnerDialog.value = false;
  editingRunner.value = null;
  runnerForm.value = {
    name: '',
    email: '',
    phone: '',
    estimatedPaceMinutes: 8,
    estimatedPaceSeconds: 0
  };
}
</script>

<style scoped>
.runner-card {
  transition: all 0.3s ease;
}

.runner-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
