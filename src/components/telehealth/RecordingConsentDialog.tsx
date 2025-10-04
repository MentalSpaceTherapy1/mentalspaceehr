import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecordingConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export const RecordingConsentDialog = ({
  open,
  onConsent,
  onDecline,
}: RecordingConsentDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recording Consent Required</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This session will be recorded for clinical documentation purposes. The recording will be:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Transcribed using secure AI technology</li>
              <li>Used to generate clinical notes</li>
              <li>Stored securely in compliance with HIPAA</li>
              <li>Automatically deleted after transcription (optional)</li>
            </ul>
            <p className="mt-4 font-medium">
              Please provide verbal consent before we begin recording.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline}>
            Decline Recording
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConsent}>
            I Consent to Recording
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
