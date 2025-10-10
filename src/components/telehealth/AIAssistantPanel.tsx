import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, FileText, Mic, Bot, Lightbulb, TrendingUp, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTwilioAI } from '@/hooks/useTwilioAI';
import { useToast } from '@/hooks/use-toast';

interface AIInsight {
  id: string;
  type: 'suggestion' | 'observation' | 'alert' | 'summary';
  title: string;
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  sessionId: string;
  isRecording: boolean;
  room: any; // Twilio Room
  provider?: 'lovable_ai' | 'twilio';
  onClose: () => void;
  onProviderChange?: (provider: 'lovable_ai' | 'twilio') => void;
}

export const AIAssistantPanel = ({
  isOpen,
  sessionId,
  isRecording,
  room,
  provider = 'lovable_ai',
  onClose,
  onProviderChange
}: AIAssistantPanelProps) => {
  const [localInsights, setLocalInsights] = useState<AIInsight[]>([]);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const { toast } = useToast();

  // Use real Twilio AI hook
  const {
    transcripts,
    currentSentiment,
    insights: aiInsights,
    isProcessing,
    enableTranscription,
    disableTranscription,
    generateSummary
  } = useTwilioAI({
    room,
    enabled: isRecording || transcriptionEnabled,
    provider,
    onTranscript: (transcript) => {
      console.log('[AI] New transcript:', transcript);
    },
    onSentiment: (sentiment) => {
      console.log('[AI] Sentiment update:', sentiment);
      
      // Show alerts for negative sentiment
      if (sentiment.label === 'negative' && sentiment.confidence > 0.7) {
        const alert: AIInsight = {
          id: Date.now().toString(),
          type: 'alert',
          title: 'Sentiment Alert',
          content: 'Detected negative sentiment. Consider checking in with client.',
          timestamp: new Date(),
          confidence: sentiment.confidence
        };
        setLocalInsights(prev => [...prev, alert]);
      }
    },
    onInsight: (insight) => {
      console.log('[AI] New insight:', insight);
      const formattedInsight: AIInsight = {
        id: Date.now().toString(),
        type: insight.type,
        title: insight.type === 'suggestion' ? 'AI Suggestion' : 
               insight.type === 'alert' ? 'Alert' : 'Observation',
        content: insight.content,
        timestamp: insight.timestamp
      };
      setLocalInsights(prev => [...prev, formattedInsight]);
    }
  });

  // Combine AI insights with local insights
  const allInsights = [...localInsights, ...aiInsights.map(ai => ({
    id: Date.now().toString() + Math.random(),
    type: ai.type as 'suggestion' | 'observation' | 'alert' | 'summary',
    title: ai.type === 'suggestion' ? 'AI Suggestion' : 
           ai.type === 'alert' ? 'Alert' : 'Observation',
    content: ai.content,
    timestamp: ai.timestamp,
    confidence: undefined
  }))].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'observation':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'summary':
        return <FileText className="h-4 w-4 text-green-500" />;
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // Keep mounted even when closed to continue AI processing

  return (
    <>
      {isOpen && (
        <Card className="w-80 h-full border-l flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Assistant</CardTitle>
                  <CardDescription className="text-xs">
                    {provider === 'twilio' ? 'Twilio Voice Intelligence' : 'Powered by Lovable AI'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onProviderChange && (
                  <select
                    value={provider}
                    onChange={(e) => onProviderChange(e.target.value as 'lovable_ai' | 'twilio')}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="lovable_ai">Lovable AI</option>
                    <option value="twilio">Twilio AI</option>
                  </select>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col">
            {/* Features Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bot className="h-4 w-4" />
                <span>Active Features</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mic className="h-3 w-3" />
                    <span className="text-xs">Live Transcription</span>
                  </div>
                  <Badge variant={transcriptionEnabled ? "default" : "secondary"} className="text-xs">
                    {transcriptionEnabled ? "On" : "Off"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3" />
                    <span className="text-xs">Sentiment Analysis</span>
                  </div>
                  <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
                    {isRecording ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span className="text-xs">Note Suggestions</span>
                  </div>
                  <Badge variant="default" className="text-xs">On</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Real-time Insights */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  <span>Real-time Insights ({allInsights.length})</span>
                </div>
                {isProcessing && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Analyzing...</span>
                  </div>
                )}
                {currentSentiment && (
                  <Badge variant={
                    currentSentiment.label === 'positive' ? 'default' :
                    currentSentiment.label === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {currentSentiment.label}
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {allInsights.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {isRecording
                          ? "AI is listening and will provide insights..."
                          : "Start recording to enable AI insights"
                        }
                      </p>
                    </div>
                  ) : (
                    allInsights.map((insight) => (
                      <Card key={insight.id} className="p-3 bg-muted/50">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {getInsightIcon(insight.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{insight.title}</p>
                              {insight.confidence && (
                                <div className="flex items-center gap-1">
                                  <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    getConfidenceColor(insight.confidence)
                                  )} />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(insight.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{insight.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {insight.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  if (transcriptionEnabled) {
                    await disableTranscription();
                    setTranscriptionEnabled(false);
                    toast({
                      title: "Transcription Stopped",
                      description: "Real-time transcription has been disabled"
                    });
                  } else {
                    const success = await enableTranscription();
                    if (success) {
                      setTranscriptionEnabled(true);
                      toast({
                        title: "Transcription Started",
                        description: "Real-time transcription is now active"
                      });
                    }
                  }
                }}
              >
                <Mic className="h-4 w-4 mr-2" />
                {transcriptionEnabled ? 'Stop' : 'Start'} Transcription
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={transcripts.length === 0}
                onClick={async () => {
                  const summary = await generateSummary();
                  if (summary) {
                    toast({
                      title: "Session Summary",
                      description: summary,
                      duration: 10000
                    });
                  }
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Session Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
