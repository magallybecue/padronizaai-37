import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Wifi,
  WifiOff 
} from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";

export const ConnectionStatus = () => {
  const healthCheckInterval = parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL) || 30000;
  const { isOnline, isChecking, lastCheck, error, checkHealth } = useHealthCheck(healthCheckInterval);

  if (isOnline && !error) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
          <CheckCircle className="w-3 h-3 mr-1" />
          Online
        </Badge>
      </div>
    );
  }

  return (
    <Alert variant={isOnline ? "default" : "destructive"} className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <div>
            <AlertDescription>
              {isOnline ? (
                "Conectado ao servidor"
              ) : (
                <div>
                  <strong>Sem conexão com o servidor</strong>
                  {error && (
                    <div className="text-sm mt-1 opacity-75">
                      {error}
                    </div>
                  )}
                </div>
              )}
              {lastCheck && (
                <div className="text-xs mt-1 opacity-75">
                  Última verificação: {lastCheck.toLocaleTimeString()}
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={checkHealth}
          disabled={isChecking}
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </Alert>
  );
};