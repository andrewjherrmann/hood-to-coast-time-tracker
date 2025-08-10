<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <h4 class="q-my-none">Settings</h4>
    </div>

    <!-- Settings Sections -->
    <div class="row q-gutter-lg">
      <!-- Mock Mode Toggle -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Development Mode</div>
            <div class="text-caption text-grey-6 q-mb-md">
              Toggle between mock data and live backend
            </div>
            <q-toggle
              v-model="isMockMode"
              label="Mock Mode"
              color="primary"
              @update:model-value="toggleMockMode"
            />
            <div class="text-caption q-mt-sm">
              {{ isMockMode ? 'Using mock data for development' : 'Connected to live backend' }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Team Information -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Team Information</div>
            <div class="q-mt-md">
              <div class="row q-gutter-md">
                <q-input
                  v-model="teamForm.name"
                  label="Team Name"
                  outlined
                  dense
                  class="col-12"
                />
                <q-input
                  v-model="teamForm.startTime"
                  label="Start Time"
                  type="datetime-local"
                  outlined
                  dense
                  class="col-12"
                />
              </div>
              <div class="q-mt-md">
                <q-btn
                  color="primary"
                  label="Update Team Info"
                  @click="saveTeamInfo"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Password Change -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Change Password</div>
            <div class="text-caption text-grey-6 q-mb-md">
              Update your account password
            </div>
            <div class="q-gutter-md">
              <q-input
                v-model="passwordForm.currentPassword"
                label="Current Password"
                type="password"
                outlined
                dense
                :rules="[val => !!val || 'Current password is required']"
              />
              <q-input
                v-model="passwordForm.newPassword"
                label="New Password"
                type="password"
                outlined
                dense
                :rules="[
                  val => !!val || 'New password is required',
                  val => val.length >= 8 || 'Password must be at least 8 characters'
                ]"
              />
              <q-input
                v-model="passwordForm.confirmPassword"
                label="Confirm New Password"
                type="password"
                outlined
                dense
                :rules="[
                  val => !!val || 'Please confirm your password',
                  val => val === passwordForm.newPassword || 'Passwords do not match'
                ]"
              />
              <q-btn
                color="primary"
                label="Change Password"
                @click="changePassword"
                :disable="!isPasswordFormValid"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Data Management -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Data Management</div>
            <div class="text-caption text-grey-6 q-mb-md">
              Manage your team's data
            </div>
            <div class="q-gutter-md">
              <q-btn
                color="warning"
                icon="download"
                label="Export Data"
                @click="exportData"
                class="full-width"
              />
              <q-btn
                color="negative"
                icon="delete_forever"
                label="Clear All Data"
                @click="confirmClearData"
                class="full-width"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Clear Data Confirmation Dialog -->
    <q-dialog v-model="showClearDataDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">
            <strong>Warning:</strong> This will permanently delete all your team's data including legs, times, and progress. This action cannot be undone.
          </span>
        </q-card-section>

        <q-card-section>
          <p>Are you absolutely sure you want to clear all data?</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Clear All Data"
            color="negative"
            @click="clearAllData"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const $q = useQuasar();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);
const isMockMode = computed(() => store.isMockMode);

// Local state
const showClearDataDialog = ref(false);

const teamForm = ref({
  name: '',
  startTime: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Computed
const isPasswordFormValid = computed(() => {
  return passwordForm.value.currentPassword &&
         passwordForm.value.newPassword &&
         passwordForm.value.confirmPassword &&
         passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
         passwordForm.value.newPassword.length >= 8;
});

// Check if we should edit team info
onMounted(() => {
  if (currentTeam.value) {
    teamForm.value.name = currentTeam.value.name;
    teamForm.value.startTime = currentTeam.value.startTime.toISOString().slice(0, 16);
  }
});

// Methods
function toggleMockMode() {
  store.toggleMockMode();
}

function saveTeamInfo() {
  if (currentTeam.value) {
    currentTeam.value.name = teamForm.value.name;
    try {
      currentTeam.value.startTime = new Date(teamForm.value.startTime);
    } catch {
      $q.notify({
        type: 'negative',
        message: 'Invalid start time format'
      });
      return;
    }
    
    $q.notify({
      type: 'positive',
      message: 'Team information updated successfully'
    });
  }
}

function changePassword() {
  // This would integrate with the backend authentication system
  // For now, we'll just show a success message
  $q.notify({
    type: 'positive',
    message: 'Password changed successfully'
  });
  
  // Reset form
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
}

function exportData() {
  if (!currentTeam.value) return;
  
  const data = {
    team: currentTeam.value,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hood-to-coast-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  $q.notify({
    type: 'positive',
    message: 'Data exported successfully'
  });
}

function confirmClearData() {
  showClearDataDialog.value = true;
}

function clearAllData() {
  store.clearAllData();
  
  $q.notify({
    type: 'positive',
    message: 'All data cleared successfully'
  });
}
</script>
