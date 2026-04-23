export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse extends ApiResponse {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
