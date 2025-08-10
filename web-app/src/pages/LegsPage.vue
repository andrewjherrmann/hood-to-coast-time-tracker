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
        <div class="row q-gutter-md">
          <div
            v-for="leg in sortedLegs"
            :key="leg.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <q-card
              :class="leg.completed ? 'bg-green-1' : 'bg-grey-1'"
              class="leg-card"
            >
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="text-h6">{{ leg.name }}</div>
                  <q-chip
                    :color="leg.completed ? 'green' : 'grey'"
                    text-color="white"
                    :label="leg.completed ? 'Completed' : 'Pending'"
                    size="sm"
                  />
                </div>
                
                <div class="row q-gutter-sm q-mt-sm">
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
                    :label="`${leg.estimatedTime} min`"
                    size="sm"
                  />
                </div>

                <div v-if="leg.completed" class="q-mt-sm">
                  <q-separator class="q-my-sm" />
                  <div class="text-caption">
                    <div>Runner: {{ leg.runner }}</div>
                    <div>Actual Time: {{ leg.actualTime }} min</div>
                  </div>
                </div>
              </q-card-section>

              <q-card-actions align="right">
                <q-btn
                  flat
                  color="secondary"
                  label="Edit"
                  size="sm"
                  @click="editLeg(leg)"
                />
                <q-btn
                  flat
                  color="negative"
                  label="Delete"
                  size="sm"
                  @click="confirmDeleteLeg(leg)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
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
              v-model="legForm.name"
              label="Leg Name"
              outlined
              dense
              :rules="[val => !!val || 'Name is required']"
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
              
              <q-input
                v-model.number="legForm.estimatedTime"
                label="Estimated Time (minutes)"
                type="number"
                outlined
                dense
                class="col"
                :rules="[val => val > 0 || 'Time must be positive']"
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

// Define the Leg interface locally since it's not exported from the store
interface Leg {
  id: string;
  name: string;
  distance: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  estimatedTime: number;
  order: number;
  completed: boolean;
  actualTime?: number;
  runner?: string;
}

const route = useRoute();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);

// Local state
const showAddLegDialog = ref(false);
const showDeleteDialog = ref(false);
const editingLeg = ref<Leg | null>(null);
const legToDelete = ref<Leg | null>(null);

const legForm = ref({
  name: '',
  distance: 0,
  difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard' | 'Very Hard',
  estimatedTime: 0
});

const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Very Hard'];

// Computed
const sortedLegs = computed(() => {
  const team = currentTeam.value;
  if (!team) return [];
  return [...team.legs].sort((a, b) => a.order - b.order);
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

function editLeg(leg: Leg) {
  editingLeg.value = leg;
  legForm.value = {
    name: leg.name,
    distance: leg.distance,
    difficulty: leg.difficulty,
    estimatedTime: leg.estimatedTime
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
    name: '',
    distance: 0,
    difficulty: 'Medium',
    estimatedTime: 0
  };
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
.leg-card {
  transition: all 0.3s ease;
}

.leg-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
