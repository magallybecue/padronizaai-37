import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

interface ProcessingLog {
  id: number;
  time: string;
  item: string;
  status: 'matched' | 'pending' | 'not_found';
  confidence?: number;
  matchedItem?: string;
}

export default function Processing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileName, totalItems } = location.state || { fileName: "arquivo.xlsx", totalItems: 1250 };

  const [progress, setProgress] = useState(0);
  const [processedItems, setProcessedItems] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [stats, setStats] = useState({
    matched: 0,
    pending: 0,
    notFound: 0
  });

  // Mock processing simulation
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 2, 100);
        const newProcessedItems = Math.floor((newProgress / 100) * totalItems);
        setProcessedItems(newProcessedItems);

        // Add mock log entries
        if (Math.random() > 0.7 && logs.length < 50) {
          const mockItems = [
            "Caneta esferográfica azul",
            "Papel A4 75g/m²",
            "Mouse óptico USB",
            "Grampeador de mesa",
            "Lápis HB nº 2",
            "Borracha escolar",
            "Régua de 30cm",
            "Calculadora científica",
            "Tinta para impressora",
            "CD-R 700MB"
          ];

          const statuses: ('matched' | 'pending' | 'not_found')[] = ['matched', 'matched', 'matched', 'pending', 'not_found'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const item = mockItems[Math.floor(Math.random() * mockItems.length)];

          const newLog: ProcessingLog = {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            item,
            status,
            confidence: status === 'matched' ? Math.floor(Math.random() * 30) + 70 : undefined,
            matchedItem: status === 'matched' ? `${item} - Padrão CATMAT` : undefined
          };

          setLogs(prev => [newLog, ...prev.slice(0, 49)]);
          setStats(prev => ({
            matched: prev.matched + (status === 'matched' ? 1 : 0),
            pending: prev.pending + (status === 'pending' ? 1 : 0),
            notFound: prev.notFound + (status === 'not_found' ? 1 : 0)
          }));
        }

        if (newProgress >= 100) {
          setTimeout(() => {
            navigate("/review", { 
              state: { 
                fileName,
                totalItems,
                processedItems: newProcessedItems,
                stats 
              }
            });
          }, 1000);
        }

        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, totalItems, navigate, fileName, logs.length, stats]);

  const toggleProcessing = () => {
    setIsRunning(!isRunning);
  };

  const stopProcessing = () => {
    setIsRunning(false);
    navigate("/review", { 
      state: { 
        fileName,
        totalItems,
        processedItems,
        stats,
        stopped: true
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge className="bg-success text-success-foreground">Match Encontrado</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground">Revisão Manual</Badge>;
      case "not_found":
        return <Badge variant="destructive">Não Encontrado</Badge>;
      default:
        return <Badge variant="secondary">Processando</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Processamento em Andamento</h1>
          <p className="text-muted-foreground">
            Arquivo: {fileName}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={toggleProcessing}>
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Continuar
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={stopProcessing}>
            <X className="mr-2 h-4 w-4" />
            Parar
          </Button>
        </div>
      </div>

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
              {processedItems.toLocaleString()} de {totalItems.toLocaleString()} itens
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
              {processedItems > 0 ? Math.round((stats.matched / processedItems) * 100) : 0}% do total processado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revisão Manual</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Requerem validação manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Encontrados</CardTitle>
            <X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.notFound}</div>
            <p className="text-xs text-muted-foreground">
              Sem correspondência encontrada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Processamento</CardTitle>
          <CardDescription>
            {isRunning ? "Processando itens..." : "Processamento pausado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Itens processados</span>
                <span>{processedItems.toLocaleString()} / {totalItems.toLocaleString()}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              Tempo estimado restante: {Math.round((100 - progress) * 0.5)} segundos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Log de Processamento</span>
          </CardTitle>
          <CardDescription>
            Acompanhe os itens sendo processados em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aguardando início do processamento...
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between space-x-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                      <span className="text-sm font-medium">{log.item}</span>
                    </div>
                    {log.matchedItem && (
                      <p className="text-xs text-muted-foreground mt-1">
                        → {log.matchedItem}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {log.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {log.confidence}%
                      </span>
                    )}
                    {getStatusBadge(log.status)}
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