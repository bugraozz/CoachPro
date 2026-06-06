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
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error?.config?.url || '';
    const isAuthRoute = url.includes('/auth/');
    const status = error?.response?.status;
    
    // Network error durumunda logout yapma - sunucu kapalı olabilir
    if (!error?.response) {
      console.error(`[API] Network Error: ${url} - sunucuya ulaşılamıyor`);
      return Promise.reject(error);
    }
    
    console.error(`[API] ${status} ${url}`, error?.response?.data);
    
    // Sadece auth dışı endpoint'lerde 401 alınırsa logout yap
    // Ama admin endpoint'lerinde 401 almak session'ın geçersiz olduğu anlamına gelmez,
    // sadece yetki eksikliği olabilir
    if (status === 401 && !isAuthRoute && !url.includes('/admin')) {
      await useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);
