<template>
  <div class="debug-panel">
    <div class="debug-header">
      <h4>🔧 Debug Panel</h4>
              <button @click="$emit('close')" class="close-btn">×</button>
    </div>
    
    <div class="debug-content">
      <div class="mode-section">
        <h5>Current Mode:</h5>
        <div class="mode-indicator" :class="{ 'mock': isMockMode, 'api': !isMockMode }">
          {{ isMockMode ? '🎭 Mock Data' : '🌐 API Mode' }}
        </div>
      </div>

      <div class="api-status" v-if="!isMockMode">
        <h5>API Status:</h5>
        <div class="status-item">
          <span class="label">Base URL:</span>
          <span class="value">{{ apiStatus.baseUrl }}</span>
        </div>
        <div class="status-item">
          <span class="label">API Available:</span>
          <span class="value" :class="{ 'success': apiStatus.isApiAvailable, 'error': !apiStatus.isApiAvailable }">
            {{ apiStatus.isApiAvailable ? '✅ Yes' : '❌ No' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Loading:</span>
          <span class="value">{{ apiStatus.isLoading ? '⏳ Yes' : '✅ No' }}</span>
        </div>
      </div>

      <div class="actions">
        <h5>Actions:</h5>
        <button 
          @click="switchToMock" 
          :disabled="isMockMode"
          class="action-btn mock-btn"
        >
          Switch to Mock Mode
        </button>
        <button 
          @click="switchToApi" 
          :disabled="!isMockMode"
          class="action-btn api-btn"
        >
          Switch to API Mode
        </button>
        <button 
          @click="reloadData" 
          class="action-btn reload-btn"
        >
          Reload Data
        </button>
      </div>

      <div class="environment-info">
        <h5>Environment:</h5>
        <div class="info-item">
          <span class="label">Mode:</span>
          <span class="value">{{ environment }}</span>
        </div>
        <div class="info-item">
          <span class="label">Local Storage:</span>
          <span class="value">{{ mockModeStatus.localStorageValue || 'Not Set' }}</span>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import { getMockModeStatus } from '../config/environment';

const store = useHoodToCoastStore();

// Define emits
defineEmits<{
  close: []
}>();

// Computed properties
const isMockMode = computed(() => store.isMockMode);
const environment = computed(() => store.environment || 'development');
const apiStatus = computed(() => store.getApiStatus());
const mockModeStatus = computed(() => getMockModeStatus());

// Actions
const switchToMock = () => {
  store.toggleMockModeForDevelopment(true);
};

const switchToApi = () => {
  store.toggleMockModeForDevelopment(false);
};

const reloadData = async () => {
  if (isMockMode.value) {
    // Reload mock data
    window.location.reload();
  } else {
    // Reload from API
    await store.loadRacesFromApi();
  }
};
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 350px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  border-radius: 8px 8px 0 0;
}

.debug-header h4 {
  margin: 0;
  color: #fff;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.debug-content {
  padding: 16px;
  color: #ccc;
}

.mode-section, .api-status, .actions, .environment-info {
  margin-bottom: 16px;
}

.mode-section h5, .api-status h5, .actions h5, .environment-info h5 {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-indicator {
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  text-align: center;
  font-size: 11px;
}

.mode-indicator.mock {
  background: #ff6b35;
  color: #fff;
}

.mode-indicator.api {
  background: #4ecdc4;
  color: #fff;
}

.status-item, .info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
}

.label {
  color: #888;
}

.value {
  color: #fff;
  font-weight: bold;
}

.value.success {
  color: #4ecdc4;
}

.value.error {
  color: #ff6b35;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mock-btn {
  background: #ff6b35;
  color: #fff;
}

.mock-btn:hover:not(:disabled) {
  background: #e55a2b;
}

.api-btn {
  background: #4ecdc4;
  color: #fff;
}

.api-btn:hover:not(:disabled) {
  background: #3db8b0;
}

.reload-btn {
  background: #45b7d1;
  color: #fff;
}

.reload-btn:hover:not(:disabled) {
  background: #3a9bb3;
}


</style>
