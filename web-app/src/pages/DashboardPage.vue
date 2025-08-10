<template>
  <q-page class="q-pa-md">
    <!-- Header with team info and mock mode toggle -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="q-my-none">{{ currentTeam?.name || 'Team Dashboard' }}</h4>
        <p class="q-my-none text-grey-6">
          Start Time: {{ formatTime(currentTeam?.startTime) }}
        </p>
      </div>
      <q-toggle
        v-model="isMockMode"
        label="Mock Mode"
        color="primary"
        @update:model-value="toggleMockMode"
      />
    </div>

    <!-- Progress Overview -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="row items-center justify-between">
          <div>
            <h6 class="q-my-none">Progress</h6>
            <p class="q-my-none text-grey-6">
              {{ completedLegs.length }} of {{ currentTeam?.legs.length || 0 }} legs completed
            </p>
          </div>
          <div class="text-right">
            <div class="text-h6 text-primary">{{ Math.round(progressPercentage) }}%</div>
            <q-linear-progress
              :value="progressPercentage / 100"
              color="primary"
              size="md"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Current Leg Carousel/Stepper -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <h6 class="q-my-none q-mb-md">Current Leg</h6>
        <div v-if="currentLeg" class="text-center">
          <q-carousel
            v-model="currentLegIndex"
            animated
            arrows
            navigation
            height="200px"
            class="rounded-borders"
          >
            <q-carousel-slide
              v-for="(leg, index) in remainingLegs"
              :key="leg.id"
              :name="index"
              class="column no-wrap"
            >
              <div class="row fit justify-start items-center q-gutter-xs">
                <div class="col-12">
                  <div class="text-h5 text-weight-bold q-mb-sm">{{ leg.name }}</div>
                  <div class="row justify-center q-gutter-md">
                    <q-chip
                      :color="getDifficultyColor(leg.difficulty)"
                      text-color="white"
                      :label="leg.difficulty"
                    />
                    <q-chip
                      color="blue"
                      text-color="white"
                      :label="`${leg.distance} mi`"
                    />
                    <q-chip
                      color="green"
                      text-color="white"
                      :label="`${leg.estimatedTime} min`"
                    />
                  </div>
                </div>
              </div>
            </q-carousel-slide>
          </q-carousel>
          
          <!-- Current leg actions -->
          <div class="q-mt-md">
            <q-btn
              color="primary"
              label="Complete Leg"
              @click="showCompleteLegDialog = true"
              class="q-mr-sm"
            />
            <q-btn
              outline
              color="secondary"
              label="Edit Leg"
              @click="editLeg(currentLeg)"
              class="q-mr-sm"
            />
            <q-btn
              outline
              color="accent"
              label="Edit Time"
              @click="editTime(currentLeg)"
            />
          </div>
        </div>
        <div v-else class="text-center text-grey-6">
          <q-icon name="check_circle" size="48px" color="green" />
          <p class="q-mt-sm">All legs completed! Great job!</p>
        </div>
      </q-card-section>
    </q-card>

    <!-- Estimated Finish Time -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <h6 class="q-my-none">Estimated Finish Time</h6>
        <div class="text-center q-mt-md">
          <div v-if="estimatedFinishTime" class="text-h4 text-primary">
            {{ formatTime(estimatedFinishTime) }}
          </div>
          <div class="text-grey-6 q-mt-sm">
            Total Distance: {{ totalDistance.toFixed(1) }} miles
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Quick Actions -->
    <q-card>
      <q-card-section>
        <h6 class="q-my-none">Quick Actions</h6>
        <div class="row q-gutter-md q-mt-md">
          <q-btn
            color="primary"
            icon="list"
            label="View All Legs"
            @click="$router.push('/legs')"
            class="col"
          />
          <q-btn
            color="secondary"
            icon="schedule"
            label="View All Times"
            @click="$router.push('/times')"
            class="col"
          />
          <q-btn
            color="accent"
            icon="settings"
            label="Settings"
            @click="$router.push('/settings')"
            class="col"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Complete Leg Dialog -->
    <q-dialog v-model="showCompleteLegDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Complete Leg</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="completeLegForm.runner"
            label="Runner Name"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model.number="completeLegForm.actualTime"
            label="Actual Time (minutes)"
            type="number"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="completeLegForm.notes"
            label="Notes (optional)"
            outlined
            dense
            type="textarea"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Complete"
            color="primary"
            @click="handleCompleteLeg"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const router = useRouter();
const store = useHoodToCoastStore();

// Local state
const showCompleteLegDialog = ref(false);
const currentLegIndex = ref(0);
const completeLegForm = ref({
  runner: '',
  actualTime: 0,
  notes: ''
});

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);
const isMockMode = computed(() => store.isMockMode);
const totalDistance = computed(() => store.totalDistance);
const completedLegs = computed(() => store.completedLegs);
const remainingLegs = computed(() => store.remainingLegs);
const currentLeg = computed(() => store.currentLeg);
const estimatedFinishTime = computed(() => store.estimatedFinishTime);
const progressPercentage = computed(() => store.progressPercentage);

// Store functions
const toggleMockMode = store.toggleMockMode;

// Methods
function formatTime(date: Date | undefined): string {
  if (!date) return 'N/A';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'green';
    case 'Medium': return 'blue';
    case 'Hard': return 'orange';
    case 'Very Hard': return 'red';
    default: return 'grey';
  }
}

function editLeg(leg: { id: string }) {
  void router.push({
    path: '/legs',
    query: { edit: leg.id }
  });
}

function editTime(time: { id: string }) {
  void router.push({
    path: '/times',
    query: { edit: time.id }
  });
}

function handleCompleteLeg() {
  if (!currentLeg.value || !completeLegForm.value.runner || !completeLegForm.value.actualTime) {
    return;
  }

  store.completeLeg(
    currentLeg.value.id,
    completeLegForm.value.actualTime,
    completeLegForm.value.runner
  );

  // Reset form
  completeLegForm.value = {
    runner: '',
    actualTime: 0,
    notes: ''
  };

  // Update carousel index
  if (remainingLegs.value.length > 0) {
    currentLegIndex.value = 0;
  }
}

// Watch for changes in remaining legs to update carousel
import { watch } from 'vue';
watch(remainingLegs, (newLegs) => {
  if (newLegs.length > 0 && currentLegIndex.value >= newLegs.length) {
    currentLegIndex.value = 0;
  }
});
</script>
