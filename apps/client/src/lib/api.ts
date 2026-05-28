import axios, { AxiosHeaders } from 'axios';

import { clearAuthToken, getAuthToken } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = getAuthToken();

  if (token !== null) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== 'undefined'
    ) {
      clearAuthToken();

      if (
        window.location.pathname !== '/' &&
        !window.location.pathname.startsWith('/auth/callback')
      ) {
        window.location.assign('/');
      }
    }

    return Promise.reject(error);
  },
);
