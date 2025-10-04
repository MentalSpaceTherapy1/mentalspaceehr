import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface DiagnosesSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function DiagnosesSection({ data }: DiagnosesSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Diagnoses</h3>
        <p className="text-sm text-muted-foreground">
          Diagnoses are imported from the Intake Assessment
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Read-Only:</strong> Diagnoses cannot be modified in the treatment plan. They are imported from the client's completed Intake Assessment. To update diagnoses, create a new Intake Assessment.
        </AlertDescription>
      </Alert>

      {data.diagnoses.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No diagnoses found. Please ensure the client has a completed and signed Intake Assessment with diagnoses before creating a treatment plan.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {data.diagnoses.map((diagnosis, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={diagnosis.type === 'Principal' ? 'default' : 'secondary'} className="text-sm">
                      {diagnosis.type}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {diagnosis.severity}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">ICD-10 Code</p>
                      <p className="text-base font-mono bg-muted px-3 py-2 rounded">{diagnosis.icdCode}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Diagnosis</p>
                      <p className="text-base bg-muted px-3 py-2 rounded">{diagnosis.diagnosis}</p>
                    </div>

                    {diagnosis.specifiers && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Specifiers</p>
                        <p className="text-base bg-muted px-3 py-2 rounded">{diagnosis.specifiers}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
