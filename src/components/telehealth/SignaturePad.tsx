import { useRef, forwardRef, useImperativeHandle } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface SignaturePadProps {
  onEnd?: () => void;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onEnd }, ref) => {
    const sigPad = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clear: () => sigPad.current?.clear(),
      isEmpty: () => sigPad.current?.isEmpty() ?? true,
      toDataURL: () => sigPad.current?.toDataURL('image/png') ?? '',
    }));

    return (
      <div className="space-y-4">
        <div className="border-2 border-border rounded-lg bg-background">
          <SignatureCanvas
            ref={sigPad}
            canvasProps={{
              className: 'w-full h-40 touch-none',
            }}
            onEnd={onEnd}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => sigPad.current?.clear()}
        >
          <Eraser className="mr-2" />
          Clear Signature
        </Button>
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';
