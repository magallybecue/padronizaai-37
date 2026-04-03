const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface UploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  matchedRows: number;
  errorRows: number;
  algorithm: 'EXACT' | 'FUZZY' | 'KEYWORD' | 'SIMILARITY';
  threshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingStatus {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  matchedRows: number;
  errorRows: number;
  algorithm: 'EXACT' | 'FUZZY' | 'KEYWORD' | 'SIMILARITY';
  threshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchingResult {
  id: string;
  uploadId: string;
  rowIndex: number;
  originalText: string;
  catmatCode?: string;
  catmatDescription?: string;
  matchScore?: number;
  algorithm: 'EXACT' | 'FUZZY' | 'KEYWORD' | 'SIMILARITY';
  status: 'PENDING' | 'MATCHED' | 'NO_MATCH' | 'MANUAL_REVIEW';
  manualReview: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/api/health');
  }

  // Upload file
  async uploadFile(
    file: File, 
    options: {
      algorithm?: 'EXACT' | 'FUZZY' | 'KEYWORD' | 'SIMILARITY';
      threshold?: number;
    } = {}
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('algorithm', options.algorithm || 'FUZZY');
    formData.append('threshold', String(options.threshold || 0.8));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}/api/uploads`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Start processing
  async startProcessing(uploadId: string): Promise<ApiResponse<{ 
    message: string; 
    uploadId: string;
    status: string;
  }>> {
    return this.request(`/api/uploads/${uploadId}/process`, {
      method: 'POST',
    });
  }

  // Get processing status
  async getProcessingStatus(uploadId: string): Promise<UploadResponse> {
    const response = await this.request<UploadResponse>(`/api/uploads/${uploadId}`);
    return response.data || response as UploadResponse;
  }

  // Get results
  async getResults(uploadId: string): Promise<ApiResponse<{
    uploadId: string;
    totalResults: number;
    results: Array<{
      originalText: string;
      catmatCode?: string;
      catmatDescription?: string;
      matchScore?: number;
      status: 'PENDING' | 'MATCHED' | 'NO_MATCH' | 'MANUAL_REVIEW';
    }>;
  }>> {
    return this.request(`/api/results?uploadId=${uploadId}`);
  }

  // Export results
  async exportResults(uploadId: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/api/exports?uploadId=${uploadId}&format=${format}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Search materials
  async searchMaterials(query: string, limit = 10): Promise<ApiResponse<Array<{
    codigoItem: string;
    descricaoItem: string;
    unit?: string;
    Categoria?: string;
  }>>> {
    return this.request(`/api/materials/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<ApiResponse<{
    totalUploads: number;
    completedUploads: number;
    processingUploads: number;
    totalItemsProcessed: number;
    totalItemsMatched: number;
    totalItemsWithErrors: number;
    matchRate: number;
    recentUploads: Array<{
      id: string;
      filename: string;
      originalName: string;
      status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
      totalRows: number;
      processedRows: number;
      matchedRows: number;
      errorRows: number;
      matchRate: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }>> {
    return this.request('/api/dashboard');
  }
}

export const apiClient = new ApiClient();
export default apiClient;