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
               <q-input
                 v-model="teamForm.name"
                 label="Team Name"
                 outlined
                 dense
                 class="col-12"
               />
               <div class="q-mt-md">
                 <q-btn
                   color="primary"
                   label="Update Team Name"
                   @click="saveTeamInfo"
                 />
               </div>
             </div>
           </q-card-section>
         </q-card>
       </div>

      <!-- User Invites -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Team Access</div>
            <div class="text-caption text-grey-6 q-mb-md">
              Manage who has access to your team
            </div>
            <div class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm">Available Users to Invite:</div>
              <div class="q-gutter-sm">
                <q-chip
                  v-for="user in availableUsers"
                  :key="user.email"
                  color="info"
                  text-color="white"
                  size="sm"
                >
                  {{ user.name }} ({{ user.email }})
                </q-chip>
              </div>
              <div class="text-caption q-mt-sm text-grey-6">
                These users can be invited to join your team. Contact your administrator to grant access.
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
               Export your team's data
             </div>
             <div class="q-gutter-md">
               <q-btn
                 color="warning"
                 icon="download"
                 label="Export Data"
                 @click="exportData"
                 class="full-width"
               />
             </div>
           </q-card-section>
         </q-card>
       </div>
    </div>

    
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
const teamForm = ref({
  name: ''
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

const availableUsers = computed(() => {
  // Mock users that can be invited (excluding current user)
  const mockUsers = [
    { email: 'admin@example.com', name: 'Admin User' },
    { email: 'john@example.com', name: 'John Doe' },
    { email: 'jane@example.com', name: 'Jane Smith' }
  ];
  
  // Filter out current user if they're in the list
  const currentUser = store.currentUser;
  if (currentUser) {
    return mockUsers.filter(user => user.email !== currentUser.email);
  }
  
  return mockUsers;
});

// Check if we should edit team info
onMounted(() => {
  if (currentTeam.value) {
    teamForm.value.name = currentTeam.value.name;
  }
});

// Methods
function toggleMockMode() {
  store.toggleMockMode();
}

function saveTeamInfo() {
  if (currentTeam.value) {
    currentTeam.value.name = teamForm.value.name;
    
    $q.notify({
      type: 'positive',
      message: 'Team name updated successfully'
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


</script>
