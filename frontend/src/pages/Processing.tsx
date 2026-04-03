import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Play,
  Pause,
  FileText
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient, UploadResponse } from "@/lib/api";


export default function Processing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { uploadId, fileName, totalItems } = location.state || {};

  const [uploadStatus, setUploadStatus] = useState<UploadResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time polling for upload status
  useEffect(() => {
    if (!uploadId || !isPolling) return;

    const pollStatus = async () => {
      try {
        const status = await apiClient.getProcessingStatus(uploadId);
        setUploadStatus(status);

        // If processing is complete, navigate to results
        if (status.status === 'COMPLETED') {
          setIsPolling(false);
          setTimeout(() => {
            navigate("/results", { 
              state: { 
                uploadId,
                fileName: status.filename,
                totalItems: status.totalRows,
                processedItems: status.processedRows,
                matchedItems: status.matchedRows,
                errorItems: status.errorRows
              }
            });
          }, 1000);
        } else if (status.status === 'FAILED') {
          setIsPolling(false);
          setError('Processamento falhou. Tente novamente.');
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setError(error instanceof Error ? error.message : 'Erro ao buscar status');
      }
    };

    // Poll immediately and then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [uploadId, isPolling, navigate]);

  // Redirect if no uploadId
  useEffect(() => {
    if (!uploadId) {
      navigate('/upload');
    }
  }, [uploadId, navigate]);

  if (!uploadId) {
    return null;
  }

  // Calculate progress percentage
  const progress = uploadStatus ? 
    (uploadStatus.processedRows / uploadStatus.totalRows) * 100 : 0;

  const stopProcessing = () => {
    setIsPolling(false);
    navigate("/upload");
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Processamento em Andamento</h1>
          <p className="text-muted-foreground">
            Arquivo: {uploadStatus?.filename || fileName || 'Carregando...'}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="destructive" onClick={stopProcessing}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-medium">Erro no Processamento</p>
          <p className="text-destructive/80 text-sm">{error}</p>
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <p className="text-xs text-muted-foreground">
              {uploadStatus?.processedRows?.toLocaleString() || 0} de {uploadStatus?.totalRows?.toLocaleString() || 0} itens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches Automáticos</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{uploadStatus?.matchedRows || 0}</div>
            <p className="text-xs text-muted-foreground">
              {uploadStatus?.processedRows && uploadStatus.processedRows > 0 
                ? Math.round((uploadStatus.matchedRows / uploadStatus.processedRows) * 100) 
                : 0}% do total processado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros/Revisão</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{uploadStatus?.errorRows || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requerem validação manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">
              {uploadStatus?.status === 'PROCESSING' ? 'Processando' :
               uploadStatus?.status === 'COMPLETED' ? 'Concluído' :
               uploadStatus?.status === 'PENDING' ? 'Aguardando' : 'Carregando...'}
            </div>
            <p className="text-xs text-muted-foreground">
              Status atual do processamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Processamento</CardTitle>
          <CardDescription>
            {uploadStatus?.status === 'PROCESSING' ? "Processando itens..." : 
             uploadStatus?.status === 'COMPLETED' ? "Processamento concluído!" :
             "Preparando processamento..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Itens processados</span>
                <span>{uploadStatus?.processedRows?.toLocaleString() || 0} / {uploadStatus?.totalRows?.toLocaleString() || 0}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              {uploadStatus?.status === 'PROCESSING' && progress > 0 && progress < 100 && (
                `Processamento em andamento...`
              )}
              {uploadStatus?.status === 'COMPLETED' && (
                'Processamento finalizado com sucesso!'
              )}
              {uploadStatus?.status === 'PENDING' && (
                'Aguardando início do processamento...'
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Informações do Upload</span>
          </CardTitle>
          <CardDescription>
            Detalhes do arquivo sendo processado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">ID do Upload:</span> {uploadId || 'Carregando...'}
            </div>
            <div>
              <span className="font-medium">Nome do Arquivo:</span> {uploadStatus?.filename || 'Carregando...'}
            </div>
            <div>
              <span className="font-medium">Algoritmo:</span> {uploadStatus?.algorithm || 'FUZZY'}
            </div>
            <div>
              <span className="font-medium">Threshold:</span> {uploadStatus?.threshold || 0.8}
            </div>
            <div>
              <span className="font-medium">Total de Linhas:</span> {uploadStatus?.totalRows?.toLocaleString() || 0}
            </div>
            <div>
              <span className="font-medium">Criado em:</span> {uploadStatus?.createdAt ? new Date(uploadStatus.createdAt).toLocaleString() : 'Carregando...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}