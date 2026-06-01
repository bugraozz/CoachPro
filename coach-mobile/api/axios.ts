import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';

const configuredBaseUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
const defaultBaseUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:4321'
  : 'http://localhost:4321';

export const AUTH_ORIGIN = (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, '');

export const API_URL = `${AUTH_ORIGIN}/api/mobile`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);
