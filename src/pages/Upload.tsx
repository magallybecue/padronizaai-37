import { useState, useCallback } from "react";
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
  Play
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview?: {
    totalRows: number;
    columns: string[];
    sampleData: string[][];
  };
}

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Mock file validation and preview
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert("Arquivo muito grande. Máximo 10MB permitido.");
      return;
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Formato não suportado. Use CSV, XLS, XLSX ou TXT.");
      return;
    }

    // Mock preview data
    const mockPreview = {
      totalRows: 1250,
      columns: ["Nome do Material", "Quantidade", "Unidade"],
      sampleData: [
        ["Caneta esferográfica azul", "100", "unidade"],
        ["Papel A4 75g/m²", "50", "resma"],
        ["Mouse óptico USB", "25", "unidade"],
        ["Grampeador de mesa", "10", "unidade"]
      ]
    };

    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      preview: mockPreview
    });
  };

  const startProcessing = () => {
    setProcessing(true);
    setProgress(0);

    // Mock processing simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            navigate("/processing", { 
              state: { 
                fileName: uploadedFile?.name,
                totalItems: uploadedFile?.preview?.totalRows 
              }
            });
          }, 500);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setProcessing(false);
    setProgress(0);
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

      {/* Upload Area */}
      {!uploadedFile && (
        <Card>
          <CardContent className="p-6">
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
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
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {uploadedFile && !processing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                {getFileIcon(uploadedFile.type)}
                <span>Arquivo Carregado</span>
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
                <span className="font-medium">Total de linhas:</span> {uploadedFile.preview?.totalRows.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Colunas:</span> {uploadedFile.preview?.columns.length}
              </div>
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
              <Button onClick={startProcessing}>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Processamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {processing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Processando arquivo...</span>
            </CardTitle>
            <CardDescription>
              Carregando arquivo e iniciando o processamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso do upload</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <p className="text-sm text-muted-foreground">
              O processamento será iniciado automaticamente após o upload...
            </p>
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