// API service for Hood to Coast Time Tracker
// Handles all HTTP calls to the backend API

import type { Race } from '../types';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://htcapi.dev.your-domain.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'your-api-key-here';

// Headers for all API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Api-Key': API_KEY,
});

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Races API
export const racesApi = {
  // Get all races
  async getAll(): Promise<{ races: Race[]; count: number }> {
    return apiRequest<{ races: Race[]; count: number }>('/races');
  },

  // Get specific race by ID
  async getById(id: string): Promise<{ race: Race }> {
    return apiRequest<{ race: Race }>(`/races/${id}`);
  },

  // Create new race
  async create(raceData: Partial<Race>): Promise<{ message: string; race: Race }> {
    return apiRequest<{ message: string; race: Race }>('/races', {
      method: 'POST',
      body: JSON.stringify(raceData),
    });
  },

  // Update existing race
  async update(id: string, raceData: Partial<Race>): Promise<{ message: string; race: Race }> {
    return apiRequest<{ message: string; race: Race }>(`/races/${id}`, {
      method: 'PUT',
      body: JSON.stringify(raceData),
    });
  },

  // Delete race
  async delete(id: string): Promise<{ message: string; id: string }> {
    return apiRequest<{ message: string; id: string }>(`/races/${id}`, {
      method: 'DELETE',
    });
  },
};

// Helper function to check if API is available
export const isApiAvailable = (): boolean => {
  return API_BASE_URL !== 'https://htcapi.dev.your-domain.com' && API_KEY !== 'your-api-key-here';
};

// Helper function to get API status
export const getApiStatus = () => ({
  baseUrl: API_BASE_URL,
  hasApiKey: API_KEY !== 'your-api-key-here',
  isAvailable: isApiAvailable(),
});
