import { Wifi, WifiOff, Signal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConnectionQualityProps {
  packetLoss: number;
  latency: number;
  jitter: number;
  connectionState: 'new' | 'connected' | 'reconnecting' | 'disconnected';
}

export const ConnectionQualityIndicator = ({
  packetLoss,
  latency,
  jitter,
  connectionState
}: ConnectionQualityProps) => {
  const getQualityLevel = (): 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected' => {
    if (connectionState !== 'connected') return 'disconnected';
    if (packetLoss > 5 || latency > 300) return 'poor';
    if (packetLoss > 3 || latency > 200) return 'fair';
    if (packetLoss > 1 || latency > 100) return 'good';
    return 'excellent';
  };

  const quality = getQualityLevel();

  const qualityConfig = {
    excellent: {
      icon: Wifi,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Excellent',
      bars: 4
    },
    good: {
      icon: Wifi,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Good',
      bars: 3
    },
    fair: {
      icon: Signal,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'Fair',
      bars: 2
    },
    poor: {
      icon: Signal,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      label: 'Poor',
      bars: 1
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'Disconnected',
      bars: 0
    }
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <Card className={cn("p-3 border", config.bgColor)}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", config.color)} />
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{config.label}</span>
            <Badge variant="outline" className="text-xs">
              {Math.round(latency)}ms
            </Badge>
          </div>
          
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < config.bars
                    ? config.color.replace('text-', 'bg-')
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {packetLoss > 0 && (
          <div className="text-xs text-muted-foreground">
            {packetLoss.toFixed(1)}% loss
          </div>
        )}
      </div>
    </Card>
  );
};
