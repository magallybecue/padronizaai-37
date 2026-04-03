import { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload as UploadIcon, 
  File, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle,
  X,
  Play,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "@/hooks/useUpload";

export default function Upload() {
  const navigate = useNavigate();
  const { 
    uploadedFile, 
    isUploading, 
    uploadProgress, 
    uploadError, 
    uploadFile, 
    removeFile, 
    startProcessing 
  } = useUpload();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleStartProcessing = async () => {
    const uploadId = await startProcessing();

    if (uploadId) {
      // Navigate to processing page
      navigate("/processing", { 
        state: { 
          uploadId,
          fileName: uploadedFile?.name,
          totalItems: uploadedFile?.preview?.totalRows 
        }
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-success" />;
    }
    return <File className="h-8 w-8 text-primary" />;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Carregado</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-warning text-warning-foreground">Processando</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Pronto</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Novo Upload</h1>
        <p className="text-muted-foreground">
          Faça upload da sua lista de materiais para padronização
        </p>
      </div>

      {/* Upload Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formatos aceitos:</strong> CSV, XLS, XLSX, TXT | 
          <strong> Tamanho máximo:</strong> 10MB | 
          <strong> Limite:</strong> 10.000 itens por arquivo
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {!uploadedFile && !isUploading && (
        <Card>
          <CardContent className="p-6">
            <div
              className="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors border-muted-foreground/25 hover:border-primary/50"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Arraste e solte seu arquivo aqui
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar um arquivo
                </p>
              </div>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv,.xls,.xlsx,.txt"
                onChange={handleFileInput}
                disabled={isUploading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Fazendo upload...</span>
            </CardTitle>
            <CardDescription>
              Enviando arquivo para o servidor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso do upload</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto o arquivo é carregado e processado...
            </p>
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {uploadedFile && !isUploading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                {getFileIcon(uploadedFile.type)}
                <span>Arquivo Carregado</span>
                {uploadedFile.status && getStatusBadge(uploadedFile.status)}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nome:</span> {uploadedFile.name}
              </div>
              <div>
                <span className="font-medium">Tamanho:</span> {formatFileSize(uploadedFile.size)}
              </div>
              <div>
                <span className="font-medium">ID do Upload:</span> {uploadedFile.id || 'Processando...'}
              </div>
              <div>
                <span className="font-medium">Status:</span> {uploadedFile.status || 'Carregado'}
              </div>
              {uploadedFile.preview && (
                <>
                  <div>
                    <span className="font-medium">Total de linhas:</span> {uploadedFile.preview.totalRows.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Colunas:</span> {uploadedFile.preview.columns.length}
                  </div>
                </>
              )}
            </div>

            {uploadedFile.preview && (
              <div>
                <h4 className="font-medium mb-2">Preview dos dados:</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {uploadedFile.preview.columns.map((col, idx) => (
                          <th key={idx} className="text-left p-2 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFile.preview.sampleData.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={removeFile}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStartProcessing}
                disabled={uploadedFile.status === 'PROCESSING'}
              >
                {uploadedFile.status === 'PROCESSING' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Processamento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Como preparar seu arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Estrutura recomendada:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Coluna 1: Nome/Descrição do material</li>
                <li>• Coluna 2: Quantidade (opcional)</li>
                <li>• Coluna 3: Unidade (opcional)</li>
                <li>• Primeira linha com cabeçalhos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Dicas importantes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use descrições detalhadas</li>
                <li>• Evite abreviações excessivas</li>
                <li>• Mantenha consistência na nomenclatura</li>
                <li>• Remova caracteres especiais desnecessários</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}