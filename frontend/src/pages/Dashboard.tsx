import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Download,
  Search,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";

interface DashboardStats {
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
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
    case "PROCESSING":
      return <Badge className="bg-warning text-warning-foreground">Processando</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
};

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getDashboardStats();
        const data = response.data || response;
        setDashboardStats(data);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Erro ao carregar dados</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardStats ? [
    {
      title: "Total de Uploads",
      value: dashboardStats.totalUploads.toLocaleString(),
      change: `${dashboardStats.completedUploads} concluídos`,
      icon: Upload,
      color: "text-primary"
    },
    {
      title: "Itens Processados",
      value: dashboardStats.totalItemsProcessed.toLocaleString(),
      change: `${dashboardStats.totalItemsMatched.toLocaleString()} matches`,
      icon: FileText,
      color: "text-success"
    },
    {
      title: "Taxa de Match",
      value: `${dashboardStats.matchRate}%`,
      change: `${dashboardStats.totalItemsWithErrors} erros`,
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Processando Agora",
      value: dashboardStats.processingUploads.toString(),
      change: "uploads ativos",
      icon: Clock,
      color: "text-warning"
    }
  ] : [];
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu uso do sistema de padronização de materiais
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Novo Upload
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Buscar Material
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-success">{stat.change}</span> em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Uploads */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uploads Recentes</CardTitle>
            <CardDescription>
              Seus processamentos mais recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats?.recentUploads.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum upload encontrado. Faça seu primeiro upload!
                </p>
              ) : (
                dashboardStats?.recentUploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {upload.originalName || upload.filename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {upload.totalRows} itens • {upload.processedRows} processados • {upload.matchRate}% match
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(upload.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(upload.status)}
                      {upload.status === "COMPLETED" && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/results" state={{ uploadId: upload.id, fileName: upload.originalName }}>
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link to="/history">Ver Todos os Uploads</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Funcionalidades principais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link to="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload de Lista
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" />
                Buscar Material
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/history">
                <FileText className="mr-2 h-4 w-4" />
                Ver Histórico
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/reports">
                <TrendingUp className="mr-2 h-4 w-4" />
                Relatórios
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral do Sistema</CardTitle>
          <CardDescription>
            Estatísticas e métricas da base CATMAT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Taxa de match global</span>
                <span>{dashboardStats?.matchRate || 0}%</span>
              </div>
              <Progress value={dashboardStats?.matchRate || 0} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Uploads concluídos</span>
                <span>{dashboardStats?.completedUploads || 0} de {dashboardStats?.totalUploads || 0}</span>
              </div>
              <Progress 
                value={dashboardStats?.totalUploads ? (dashboardStats.completedUploads / dashboardStats.totalUploads) * 100 : 0} 
                className="mt-2" 
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• Base CATMAT: 326.195 materiais carregados</p>
              <p>• Sistema de matching em produção</p>
              <p>• Algoritmo: Busca exata + palavras-chave</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}