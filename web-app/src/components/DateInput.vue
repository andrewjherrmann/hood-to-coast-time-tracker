<template>
  <q-input
    :model-value="modelValue"
    :label="defaultLabel"
    outlined
    dense
    class="full-width"
    placeholder="e.g., 8/23/2024"
    :rules="[val => !!val || 'Date is required', val => isValidDate(val) || 'Invalid date format']"
    @blur="formatDateInput"
    @update:model-value="(value) => $emit('update:modelValue', value as string | null)"
  >
    <template v-slot:hint>
      Enter date as M/D/YYYY (e.g., 8/23/2024)
    </template>
    <template v-slot:append>
      <q-icon name="event" class="cursor-pointer">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date
            :model-value="modelValue"
            mask="M/D/YYYY"
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
const defaultLabel = computed(() => props.label || 'Date (M/D/YYYY)');
defineEmits<Emits>();

// Validation function for date format M/D/YYYY
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  
  const monthStr = parts[0];
  const dayStr = parts[1];
  const yearStr = parts[2];
  
  if (!monthStr || !dayStr || !yearStr) return false;
  
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  const year = parseInt(yearStr);
  
  if (isNaN(month) || isNaN(day) || isNaN(year)) return false;
  
  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  return true;
}

// Format date input on blur
function formatDateInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  
  if (!value) return;
  
  // Try to parse and format the date
  const parts = value.split('/');
  if (parts.length === 3) {
    const monthStr = parts[0];
    const dayStr = parts[1];
    const yearStr = parts[2];
    
    if (monthStr && dayStr && yearStr) {
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      const year = parseInt(yearStr);
      
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        // Format as M/D/YYYY
        const formattedDate = `${month}/${day}/${year}`;
        target.value = formattedDate;
      }
    }
  }
}
</script>
