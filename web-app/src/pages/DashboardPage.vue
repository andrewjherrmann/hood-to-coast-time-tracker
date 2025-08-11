<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="q-my-none">{{ currentTeam?.name || 'Team Dashboard' }}</h4>
        <p class="q-mt-sm q-mb-none text-grey-7">
          Start Time: {{ formatStartTime(currentTeam?.startTime) }}
        </p>
      </div>
      <div class="text-right">
        <q-chip
          :color="isMockMode ? 'orange' : 'green'"
          text-color="white"
          :label="isMockMode ? 'Mock Mode' : 'Live Mode'"
          size="sm"
        />
      </div>
    </div>

    <!-- Progress Overview -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="text-center">
          <q-card-section>
            <div class="text-h4 text-primary">{{ totalDistance }}</div>
            <div class="text-caption">Total Distance (miles)</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="text-center">
          <q-card-section>
            <div class="text-h4 text-green">{{ completedLegs.length }}</div>
            <div class="text-caption">Completed Legs</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="text-center">
          <q-card-section>
            <div class="text-h4 text-blue">{{ remainingLegs.length }}</div>
            <div class="text-caption">Remaining Legs</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="text-center">
          <q-card-section>
            <div class="text-h4 text-orange">{{ progressPercentage.toFixed(1) }}%</div>
            <div class="text-caption">Progress</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Progress Bar -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Race Progress</div>
        <q-linear-progress
          :value="progressPercentage / 100"
          color="primary"
          size="lg"
        />
        <div class="text-caption q-mt-sm">
          {{ completedLegs.length }} of {{ currentTeam?.legs.length || 0 }} legs completed
        </div>
      </q-card-section>
    </q-card>

    <!-- Current Leg Focus -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Current Focus</div>
        <div v-if="currentLeg" class="text-center">
                        <div class="text-h4 text-primary q-mb-sm">Leg {{ currentLeg.order }}</div>
          <div class="row q-gutter-md justify-center">
            <q-chip
              :color="getDifficultyColor(currentLeg.difficulty)"
              text-color="white"
              :label="currentLeg.difficulty"
              size="lg"
            />
            <q-chip
              color="blue"
              text-color="white"
              :label="`${currentLeg.distance} mi`"
              size="lg"
            />
                         <q-chip
               color="green"
               text-color="white"
               :label="`${store.getLegEstimatedTime(currentLeg)} min`"
               size="lg"
             />
          </div>
          
          <!-- Runner Assignment -->
          <div v-if="currentLeg.runnerId" class="q-mt-md">
            <q-chip
              color="purple"
              text-color="white"
              :label="`Runner: ${getRunnerName(currentLeg.runnerId)}`"
              size="md"
            />
            <div class="text-caption q-mt-xs">
              Pace: {{ getRunnerPace(currentLeg.runnerId) }} / mile
            </div>
          </div>
          <div v-else class="q-mt-md">
            <q-chip
              color="grey"
              text-color="white"
              label="No Runner Assigned"
              size="md"
            />
          </div>
        </div>
        <div v-else class="text-center text-grey-6">
          <q-icon name="flag" size="48px" />
          <div class="text-h6 q-mt-sm">All legs completed!</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Estimated Finish Time -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Estimated Finish Time</div>
        <div v-if="estimatedFinishTime" class="text-center">
          <div class="text-h4 text-green q-mb-sm">
            {{ formatFinishTime(estimatedFinishTime) }}
          </div>
          <div class="text-caption">
            Based on runner paces and completed legs
          </div>
        </div>
        <div v-else class="text-center text-grey-6">
          <q-icon name="schedule" size="48px" />
          <div class="text-h6 q-mt-sm">No start time set</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Quick Actions -->
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Quick Actions</div>
        <div class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <q-btn
              color="primary"
              icon="edit"
              label="Edit Current Leg"
              class="full-width"
              @click="editCurrentLeg"
              :disable="!currentLeg"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-btn
              color="secondary"
              icon="timer"
              label="Record Time"
              class="full-width"
              @click="recordTime"
              :disable="!currentLeg"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const router = useRouter();
const store = useHoodToCoastStore();

// Access store properties directly without destructuring
const currentTeam = computed(() => store.currentTeam);
const isMockMode = computed(() => store.isMockMode);
const totalDistance = computed(() => store.totalDistance);
const completedLegs = computed(() => store.completedLegs);
const remainingLegs = computed(() => store.remainingLegs);
const currentLeg = computed(() => store.currentLeg);
const estimatedFinishTime = computed(() => store.estimatedFinishTime);
const progressPercentage = computed(() => store.progressPercentage);

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

function getRunnerPace(runnerId?: string): string {
  if (!runnerId) return 'N/A';
  const team = currentTeam.value;
  if (!team) return 'N/A';
  const runner = team.runners.find(r => r.id === runnerId);
  if (runner) {
    return `${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}`;
  }
  return 'N/A';
}

function formatStartTime(startTime?: Date): string {
  if (!startTime) return 'Not set';
  return new Date(startTime).toLocaleString();
}

function formatFinishTime(finishTime: Date): string {
  return new Date(finishTime).toLocaleString();
}

function editCurrentLeg() {
  if (currentLeg.value) {
    void router.push({
      path: '/legs',
      query: { edit: currentLeg.value.id }
    });
  }
}

function recordTime() {
  if (currentLeg.value) {
    void router.push({
      path: '/times',
      query: { leg: currentLeg.value.id }
    });
  }
}
</script>
