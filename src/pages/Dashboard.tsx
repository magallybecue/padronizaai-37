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
  Search
} from "lucide-react";
import { Link } from "react-router-dom";

// Mock data for dashboard
const stats = [
  {
    title: "Total de Uploads",
    value: "1,234",
    change: "+12%",
    icon: Upload,
    color: "text-gov-blue"
  },
  {
    title: "Itens Processados",
    value: "45,678",
    change: "+8%",
    icon: FileText,
    color: "text-gov-green"
  },
  {
    title: "Taxa de Match",
    value: "87.5%",
    change: "+3%",
    icon: CheckCircle,
    color: "text-success"
  },
  {
    title: "Tempo Médio",
    value: "2.3min",
    change: "-15%",
    icon: Clock,
    color: "text-warning"
  }
];

const recentUploads = [
  {
    id: 1,
    fileName: "lista_materiais_2024.xlsx",
    items: 1250,
    matched: 1089,
    status: "completed",
    date: "2024-01-15 14:30"
  },
  {
    id: 2,
    fileName: "compras_departamento_ti.csv",
    items: 89,
    matched: 76,
    status: "completed",
    date: "2024-01-15 11:20"
  },
  {
    id: 3,
    fileName: "materiais_escritorio.xlsx",
    items: 456,
    matched: 0,
    status: "processing",
    date: "2024-01-15 16:45"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
    case "processing":
      return <Badge className="bg-warning text-warning-foreground">Processando</Badge>;
    case "error":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
};

export default function Dashboard() {
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
              {recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {upload.fileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {upload.items} itens • {upload.matched} processados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {upload.date}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(upload.status)}
                    {upload.status === "completed" && (
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral de Uso</CardTitle>
          <CardDescription>
            Estatísticas do seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Uploads utilizados este mês</span>
                <span>27 de 50</span>
              </div>
              <Progress value={54} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Itens processados este mês</span>
                <span>45,678 de 100,000</span>
              </div>
              <Progress value={45.7} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}