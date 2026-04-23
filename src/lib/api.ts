import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { createClient } from "@/utils/supabase/client";
import { env } from "./env";
import { ApiResponse, ApiError } from "@/types/api";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

class SentryFrontendError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryFrontendError";
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      window.location.href = "/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors consistently
const handleApiError = (error: unknown): ApiResponse => {
  if (error instanceof AxiosError) {
    return {
      error: error.response?.data?.message || error.message,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
    };
  }

  return {
    error: "An unknown error occurred",
  };
};

// Helper methods
export const http = {
  get: async <T>(url: string, params = {}): Promise<ApiResponse<T>> => {
    try {
      const response = await api.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async <T>(url: string, data = {}): Promise<ApiResponse<T>> => {
    try {
      const response = await api.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async <T>(url: string, data = {}): Promise<ApiResponse<T>> => {
    try {
      const response = await api.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    try {
      const response = await api.delete<ApiResponse<T>>(url);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  upload: async <T = any>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token)
        throw new SentryFrontendError("Authentication required");

      const response = await api.post<ApiResponse<T>>(url, formData, {
        ...config,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${session.access_token}`,
          ...config?.headers,
        },
      });

      return response.data;
    } catch (error) {
      // Capture upload-specific errors in Sentry

      return handleApiError(error);
    }
  },
};

export default http;
