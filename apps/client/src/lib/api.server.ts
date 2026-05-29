import type { TodakResponse } from '@/sevice/response';

import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getServerAuthToken } from './auth.server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function getApiBaseUrl() {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');

  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use(config => {
  return attachAuthHeader(config);
});

async function attachAuthHeader(config: InternalAxiosRequestConfig) {
  const token = await getServerAuthToken();

  if (token !== null) {
    const headers = AxiosHeaders.from(config.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
  }

  return config;
}

type ApiConfig<TBody = unknown> = AxiosRequestConfig<TBody>;
type ApiMethodConfig<TBody = unknown> = Omit<
  ApiConfig<TBody>,
  'data' | 'method' | 'url'
>;

async function request<TData, TBody = unknown>(
  config: ApiConfig<TBody>,
): Promise<TData> {
  const response = await api.request<
    TodakResponse<TData>,
    AxiosResponse<TodakResponse<TData>>,
    TBody
  >(config);

  return response.data.data;
}

export const apiServer = {
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
