import axios, { AxiosHeaders } from 'axios';

import { getAuthToken } from './auth';

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
