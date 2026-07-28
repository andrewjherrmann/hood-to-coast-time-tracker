<template>
  <q-select
    v-model="selectedRunnerId"
    :options="runnerOptions"
    option-label="label"
    option-value="value"
    :label="label"
    outlined
    dense
    class="full-width"
    :rules="rules"
    :disable="disable"
  >
    <template v-slot:prepend>
      <q-icon name="person" />
    </template>
    
    <template v-slot:selected>
      <div v-if="selectedRunnerId" class="text-body1">
        {{ getSelectedRunnerName() }}
        <span class="text-caption text-grey-6 q-ml-sm">
          ({{ getSelectedRunnerPace() }})
        </span>
      </div>
      <div v-else class="text-grey-6">
        {{ placeholder || 'Select a runner...' }}
      </div>
    </template>
    
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.label }}</q-item-label>
          <q-item-label caption v-if="scope.opt.pace !== 'N/A'">
            Estimated Pace: {{ scope.opt.pace }} per mile
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import type { Runner } from '../types';

interface Props {
  modelValue?: string | undefined;
  runners: Runner[];
  label?: string;
  placeholder?: string;
  rules?: Array<(val: string | undefined) => boolean | string>;
  showUnassigned?: boolean;
  disable?: boolean | undefined;
}

interface Emits {
  (e: 'update:modelValue', value: string | undefined): void;
  (e: 'runnerSelected', runner: Runner | undefined): void;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Select Runner',
  placeholder: 'Select a runner...',
  rules: () => [],
  showUnassigned: true
});

const emit = defineEmits<Emits>();

// Local ref for the selected runner ID
const selectedRunnerId = ref(props.modelValue);

// Watch for prop changes and update local ref
watch(() => props.modelValue, (newValue) => {
  selectedRunnerId.value = newValue;
});

// Watch for local ref changes and emit events
watch(selectedRunnerId, (newValue) => {
  console.log('selectedRunnerId changed to:', newValue);
  
  // Handle both string ID and option object cases
  let actualRunnerId: string | undefined;
  if (typeof newValue === 'string') {
    actualRunnerId = newValue;
  } else if (newValue && typeof newValue === 'object' && 'value' in newValue) {
    actualRunnerId = (newValue as { value: string }).value;
  }
  
  console.log('Actual runner ID:', actualRunnerId);
  emit('update:modelValue', actualRunnerId);
  
  if (actualRunnerId) {
    const runner = props.runners.find(r => r.id === actualRunnerId);
    console.log('Found runner for display:', runner);
    emit('runnerSelected', runner);
  } else {
    emit('runnerSelected', undefined);
  }
});

const runnerOptions = computed(() => {
  const options = [];
  
  if (props.showUnassigned) {
    options.push({ 
      label: 'No Runner Assigned', 
      value: undefined, 
      pace: 'N/A' 
    });
  }
  
  // Sort runners alphabetically by name
  const sortedRunners = [...props.runners].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  options.push(...sortedRunners.map(runner => ({
    label: runner.name,
    value: runner.id,
    pace: `${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}`
  })));
  
  return options;
});

// Methods
function getSelectedRunnerName(): string {
  if (!selectedRunnerId.value) return 'No Runner Assigned';
  const runner = props.runners.find(r => r.id === selectedRunnerId.value);
  return runner ? runner.name : 'Unknown Runner';
}

function getSelectedRunnerPace(): string {
  if (!selectedRunnerId.value) return 'N/A';
  const runner = props.runners.find(r => r.id === selectedRunnerId.value);
  if (!runner) return 'N/A';
  return `${runner.estimatedPaceMinutes}:${runner.estimatedPaceSeconds.toString().padStart(2, '0')}`;
}


</script>
