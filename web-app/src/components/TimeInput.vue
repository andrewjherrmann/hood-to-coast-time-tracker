<template>
  <q-input
    :model-value="modelValue"
    :label="defaultLabel"
    outlined
    dense
    class="full-width"
    placeholder="e.g., 2:30 PM"
    :rules="[val => !!val || 'Time is required', val => isValidTime(val) || 'Invalid time format']"
    @blur="formatTimeInput"
    @update:model-value="(value) => $emit('update:modelValue', value as string | null)"
  >
    <template v-slot:hint>
      Enter time as h:mm AM/PM (e.g., 2:30 PM)
    </template>
    <template v-slot:append>
      <q-icon name="access_time" class="cursor-pointer">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-time
            :model-value="modelValue"
            mask="h:mm A"
            format24h
            @update:model-value="(value) => $emit('update:modelValue', value as string | null)"
          />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup lang="ts">
import { computed } from 'vue';
// defineProps and defineEmits are compiler macros, no import needed

interface Props {
  modelValue: string | null;
  label?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string | null): void;
}

const props = defineProps<Props>();

// Default label if none provided
const defaultLabel = computed(() => props.label || 'Time (h:mm AM/PM)');
defineEmits<Emits>();

// Validation function for time format h:mm AM/PM
function isValidTime(timeStr: string): boolean {
  if (!timeStr) return false;
  
  const parts = timeStr.split(' ');
  if (parts.length !== 2) return false;
  
  const timePart = parts[0];
  const period = parts[1];
  
  if (!timePart || !period) return false;
  
  const timeComponents = timePart.split(':');
  if (timeComponents.length !== 2) return false;
  
  const hours = timeComponents[0];
  const minutes = timeComponents[1];
  
  if (!hours || !minutes) return false;
  
  const hour = parseInt(hours);
  const minute = parseInt(minutes);
  
  if (isNaN(hour) || isNaN(minute)) return false;
  
  // Basic validation
  if (hour < 1 || hour > 12) return false;
  if (minute < 0 || minute > 59) return false;
  if (period !== 'AM' && period !== 'PM') return false;
  
  return true;
}

// Format time input on blur
function formatTimeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  
  if (!value) return;
  
  // Try to parse and format the time
  const parts = value.split(' ');
  if (parts.length === 2) {
    const timePart = parts[0];
    const period = parts[1];
    
    if (timePart && period) {
      const timeComponents = timePart.split(':');
      if (timeComponents.length === 2) {
        const hours = timeComponents[0];
        const minutes = timeComponents[1];
        
        if (hours && minutes) {
          const hour = parseInt(hours);
          const minute = parseInt(minutes);
          
          if (!isNaN(hour) && !isNaN(minute)) {
            // Format as h:mm AM/PM
            const formattedTime = `${hour}:${minute.toString().padStart(2, '0')} ${period.toUpperCase()}`;
            target.value = formattedTime;
          }
        }
      }
    }
  }
}
</script>
