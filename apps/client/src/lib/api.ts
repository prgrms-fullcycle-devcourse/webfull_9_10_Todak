import type { TodakResponse } from '@/sevice/response';

import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { clearAuthToken, getAuthToken } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function getApiBaseUrl() {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');

  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
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

type ApiConfig<TBody = unknown> = AxiosRequestConfig<TBody>;
type ApiMethodConfig<TBody = unknown> = Omit<
  ApiConfig<TBody>,
  'data' | 'method' | 'url'
>;

export async function request<TData, TBody = unknown>(
  config: ApiConfig<TBody>,
): Promise<TData> {
  const response = await api.request<
    TodakResponse<TData>,
    AxiosResponse<TodakResponse<TData>>,
    TBody
  >(config);

  return response.data.data;
}

export const apiClient = {
  get<TData>(url: string, config?: ApiMethodConfig) {
    return request<TData>({ ...config, method: 'GET', url });
  },

  post<TData, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: ApiMethodConfig<TBody>,
  ) {
    return request<TData, TBody>({ ...config, data, method: 'POST', url });
  },

  patch<TData, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: ApiMethodConfig<TBody>,
  ) {
    return request<TData, TBody>({ ...config, data, method: 'PATCH', url });
  },

  delete<TData>(url: string, config?: ApiMethodConfig) {
    return request<TData>({ ...config, method: 'DELETE', url });
  },
};
