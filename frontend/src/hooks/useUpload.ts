import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface UploadedFile {
  id?: string;
  name: string;
  size: number;
  type: string;
  preview?: {
    totalRows: number;
    columns: string[];
    sampleData: string[][];
  };
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

interface UseUploadState {
  uploadedFile: UploadedFile | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
}

export const useUpload = () => {
  const [state, setState] = useState<UseUploadState>({
    uploadedFile: null,
    isUploading: false,
    uploadProgress: 0,
    uploadError: null,
  });

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Arquivo muito grande. Máximo 10MB permitido.' };
    }

    // Allowed types
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Formato não suportado. Use CSV, XLS, XLSX ou TXT.' };
    }

    return { valid: true };
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    // Reset state
    setState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0,
      uploadError: null,
    }));

    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + Math.random() * 20, 90)
        }));
      }, 200);

      // Upload file to API with algorithm options
      const response = await apiClient.uploadFile(file, {
        algorithm: 'FUZZY',
        threshold: 0.8
      });

      // Clear progress interval
      clearInterval(progressInterval);

      // Handle API response structure
      const uploadData = response.data || response;
      if (uploadData && uploadData.id) {
        setState(prev => ({
          ...prev,
          uploadedFile: {
            id: uploadData.id,
            name: file.name,
            size: file.size,
            type: file.type,
            status: uploadData.status,
            preview: {
              totalRows: uploadData.totalRows,
              columns: ['Descrição'],
              sampleData: [] // Will be populated from actual file content if needed
            },
          },
          isUploading: false,
          uploadProgress: 100,
        }));
      } else {
        throw new Error('Falha no upload do arquivo');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        uploadError: error instanceof Error ? error.message : 'Erro desconhecido no upload',
      }));
    }
  }, [validateFile]);

  const removeFile = useCallback(() => {
    setState({
      uploadedFile: null,
      isUploading: false,
      uploadProgress: 0,
      uploadError: null,
    });
  }, []);

  const startProcessing = useCallback(async (): Promise<string | null> => {
    if (!state.uploadedFile?.id) return null;

    try {
      const response = await apiClient.startProcessing(state.uploadedFile.id);
      
      // Handle API response structure  
      const responseData = response.data || response;
      if (responseData && (responseData as any).uploadId) {
        // Update file status
        setState(prev => ({
          ...prev,
          uploadedFile: prev.uploadedFile ? {
            ...prev.uploadedFile,
            status: 'PROCESSING'
          } : null
        }));
        
        return state.uploadedFile.id;
      }
      
      throw new Error('Falha ao iniciar processamento');
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploadError: error instanceof Error ? error.message : 'Erro ao iniciar processamento'
      }));
      return null;
    }
  }, [state.uploadedFile]);

  return {
    ...state,
    uploadFile,
    removeFile,
    startProcessing,
    validateFile,
  };
};