import axios from 'axios';
import { EventEmitter } from './events';

// const baseURL = 'https://backend-forge-neet.onrender.com';
const baseURL = 'http://localhost:5002';
export const API_BASE_URL = baseURL;

// In-memory token for synchronous interceptor access
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 120000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authToken = null;
      EventEmitter.emit('auth:unauthorized');
    }
    return Promise.reject(error);
  }
);

export default api;
