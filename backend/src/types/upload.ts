import { UploadRequest, UploadResponse, MatchingResult } from '@/config/api';

// Re-export from config for convenience
export type { UploadRequest, UploadResponse, MatchingResult } from '@/config/api';

export interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  matchedRows: number;
  errorRows: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  progress: number; // calculated percentage
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    estimatedRows?: number;
  };
}