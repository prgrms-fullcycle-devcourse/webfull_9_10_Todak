import type { TodakResponse } from '@/services/response';

import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { clearAuthToken, getAuthToken, refreshAuthToken } from './auth';

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

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

let refreshAuthTokenPromise: Promise<string | null> | null = null;

api.interceptors.request.use(config => {
  const token = getAuthToken();

  if (token !== null) {
    const headers = AxiosHeaders.from(config.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      isAccessTokenExpiredError(error) &&
      originalRequest !== undefined &&
      originalRequest._authRetry !== true &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._authRetry = true;

      const token = await getRefreshAuthTokenPromise();

      if (token !== null) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set('Authorization', `Bearer ${token}`);
        originalRequest.headers = headers;

        return api.request(originalRequest);
      }
    }

    if (isUnauthorizedError(error)) {
      clearAuthToken();
      redirectToHome();
    }

    return Promise.reject(error);
  },
);

function getRefreshAuthTokenPromise() {
  if (refreshAuthTokenPromise === null) {
    refreshAuthTokenPromise = refreshAuthToken().finally(() => {
      refreshAuthTokenPromise = null;
    });
  }

  return refreshAuthTokenPromise;
}

function isAccessTokenExpiredError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const code = getErrorCode(error.response?.data);

  return status === 401 && code === 'TOKEN_EXPIRED';
}

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getErrorCode(data: unknown) {
  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return null;
  }

  const { code } = data as { code: unknown };

  return typeof code === 'string' ? code : null;
}

function isAuthEndpoint(url?: string) {
  if (url === undefined) {
    return false;
  }

  return url.includes('/auth/refresh') || url.includes('/auth/logout');
}

function redirectToHome() {
  if (typeof window === 'undefined') {
    return;
  }

  if (
    window.location.pathname !== '/' &&
    !window.location.pathname.startsWith('/auth/callback')
  ) {
    window.location.assign('/');
  }
}

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
