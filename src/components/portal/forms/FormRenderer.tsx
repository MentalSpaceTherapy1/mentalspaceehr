import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FormTemplate, FormResponse } from '@/types/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FormFieldRenderer } from './FormFieldRenderer';
import { SignaturePad, SignaturePadRef } from '@/components/telehealth/SignaturePad';
import { AlertCircle, Clock, Save, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';

interface FormRendererProps {
  template: FormTemplate;
  response?: FormResponse;
  onSaveProgress: (responses: Record<string, any>, progressPercentage: number) => void;
  onSubmit: (responses: Record<string, any>, signature?: string, timeSpentSeconds?: number) => void;
  onCancel: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
}

export const FormRenderer = ({
  template,
  response,
  onSaveProgress,
  onSubmit,
  onCancel,
  isSaving,
  isSubmitting,
}: FormRendererProps) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSignature, setShowSignature] = useState(false);
  const [startTime] = useState(Date.now());
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const form = useForm({
    defaultValues: response?.responses || {},
  });

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  const currentSection = sortedSections[currentSectionIndex];
  const totalSections = sortedSections.length;

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!template.allow_partial_save) return;

    const interval = setInterval(() => {
      const values = form.getValues();
      const progress = calculateProgress(values);
      onSaveProgress(values, progress);
    }, 30000);

    return () => clearInterval(interval);
  }, [template, form, onSaveProgress]);

  const calculateProgress = (values: Record<string, any>) => {
    const allFields = sortedSections.flatMap(s => s.fields);
    const requiredFields = allFields.filter(f => f.required);
    const filledRequired = requiredFields.filter(f => values[f.id]).length;
    return Math.round((filledRequired / requiredFields.length) * 100);
  };

  const validateSection = async () => {
    const fieldIds = currentSection.fields.map(f => f.id);
    return await form.trigger(fieldIds as any);
  };

  const handleNext = async () => {
    const isValid = await validateSection();
    if (!isValid) return;

    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else if (template.requires_signature) {
      setShowSignature(true);
    } else {
      handleFormSubmit();
    }
  };

  const handlePrevious = () => {
    if (showSignature) {
      setShowSignature(false);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleFormSubmit = async () => {
    const values = form.getValues();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    let signature: string | undefined;
    if (template.requires_signature) {
      if (signaturePadRef.current?.isEmpty()) {
        form.setError('signature' as any, {
          message: 'Signature is required',
        });
        return;
      }
      signature = signaturePadRef.current?.toDataURL();
    }

    onSubmit(values, signature, timeSpent);
  };

  const progress = calculateProgress(form.watch());

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{template.title}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
            {template.estimated_minutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Estimated time: {template.estimated_minutes} minutes</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {!showSignature ? (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{currentSection.title}</h3>
                    {currentSection.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentSection.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Section {currentSectionIndex + 1} of {totalSections}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {currentSection.fields
                      .sort((a, b) => a.order - b.order)
                      .map(field => (
                        <FormFieldRenderer
                          key={field.id}
                          field={field}
                          form={form}
                        />
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please review your responses and provide your signature to complete this form.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Your Signature <span className="text-destructive">*</span>
                  </label>
                  <SignaturePad ref={signaturePadRef} />
                  {form.formState.errors.signature && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.signature.message as string}
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  By signing this form, you acknowledge that the information provided is accurate and complete.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div>
              {(currentSectionIndex > 0 || showSignature) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSaving || isSubmitting}
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving || isSubmitting}
              >
                Cancel
              </Button>

              {template.allow_partial_save && !showSignature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const values = form.getValues();
                    onSaveProgress(values, progress);
                  }}
                  disabled={isSaving || isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </Button>
              )}

              {!showSignature ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving || isSubmitting}
                >
                  {currentSectionIndex < totalSections - 1 ? 'Next' : template.requires_signature ? 'Review & Sign' : 'Submit'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSaving || isSubmitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Form'}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </Form>
  );
};
