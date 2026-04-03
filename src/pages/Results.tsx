import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertTriangle,
  X,
  Download,
  FileText,
  ArrowLeft,
  Search
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";

interface ResultItem {
  originalText: string;
  catmatCode?: string;
  catmatDescription?: string;
  matchScore?: number;
  status: 'PENDING' | 'MATCHED' | 'NO_MATCH' | 'MANUAL_REVIEW';
}

interface ResultsData {
  uploadId: string;
  totalResults: number;
  results: ResultItem[];
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { uploadId, fileName, totalItems, processedItems, matchedItems, errorItems } = location.state || {};

  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'MATCHED' | 'NO_MATCH' | 'MANUAL_REVIEW'>('ALL');

  // Load results from API
  useEffect(() => {
    if (!uploadId) {
      navigate('/upload');
      return;
    }

    const loadResults = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getResults(uploadId);
        const data = response.data || response;
        setResultsData(data);
      } catch (error) {
        console.error('Error loading results:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar resultados');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [uploadId, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MATCHED":
        return <Badge className="bg-success text-success-foreground">Match Encontrado</Badge>;
      case "MANUAL_REVIEW":
        return <Badge className="bg-warning text-warning-foreground">Revisão Manual</Badge>;
      case "NO_MATCH":
        return <Badge variant="destructive">Não Encontrado</Badge>;
      default:
        return <Badge variant="secondary">Processando</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "MATCHED":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "MANUAL_REVIEW":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "NO_MATCH":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleExport = async () => {
    if (!uploadId) return;
    
    try {
      const blob = await apiClient.exportResults(uploadId, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `resultados_${fileName || 'export'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  };

  const filteredResults = resultsData?.results.filter(result => {
    if (filter === 'ALL') return true;
    return result.status === filter;
  }) || [];

  const stats = resultsData ? {
    matched: resultsData.results.filter(r => r.status === 'MATCHED').length,
    manualReview: resultsData.results.filter(r => r.status === 'MANUAL_REVIEW').length,
    noMatch: resultsData.results.filter(r => r.status === 'NO_MATCH').length,
    total: resultsData.totalResults
  } : {
    matched: matchedItems || 0,
    manualReview: errorItems || 0,
    noMatch: 0,
    total: totalItems || 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/upload')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Erro ao Carregar Resultados</h1>
            <p className="text-muted-foreground">
              Não foi possível carregar os resultados do processamento
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/upload')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Novo Upload
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resultados do Processamento</h1>
            <p className="text-muted-foreground">
              Arquivo: {fileName || 'arquivo.csv'}
            </p>
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Resultados
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Processados com sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches Automáticos</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.matched}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revisão Manual</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.manualReview}</div>
            <p className="text-xs text-muted-foreground">
              Requerem validação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Encontrados</CardTitle>
            <X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.noMatch}</div>
            <p className="text-xs text-muted-foreground">
              Sem correspondência
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar Resultados</CardTitle>
          <CardDescription>
            Visualize diferentes tipos de resultados do matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              variant={filter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilter('ALL')}
            >
              Todos ({stats.total})
            </Button>
            <Button 
              variant={filter === 'MATCHED' ? 'default' : 'outline'}
              onClick={() => setFilter('MATCHED')}
            >
              Matches ({stats.matched})
            </Button>
            <Button 
              variant={filter === 'MANUAL_REVIEW' ? 'default' : 'outline'}
              onClick={() => setFilter('MANUAL_REVIEW')}
            >
              Revisão ({stats.manualReview})
            </Button>
            <Button 
              variant={filter === 'NO_MATCH' ? 'default' : 'outline'}
              onClick={() => setFilter('NO_MATCH')}
            >
              Não Encontrados ({stats.noMatch})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados Detalhados</CardTitle>
          <CardDescription>
            {filteredResults.length} de {stats.total} resultados exibidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum resultado encontrado para o filtro selecionado.
              </p>
            ) : (
              filteredResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">Texto Original:</span>
                        <span>{result.originalText}</span>
                      </div>
                      
                      {result.status === 'MATCHED' && result.catmatDescription && (
                        <div className="pl-6 space-y-1">
                          <div>
                            <span className="font-medium text-success">Código CATMAT:</span>
                            <span className="ml-2">{result.catmatCode}</span>
                          </div>
                          <div>
                            <span className="font-medium text-success">Descrição:</span>
                            <span className="ml-2">{result.catmatDescription}</span>
                          </div>
                          {result.matchScore && (
                            <div>
                              <span className="font-medium text-success">Score:</span>
                              <span className="ml-2">{(result.matchScore * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}