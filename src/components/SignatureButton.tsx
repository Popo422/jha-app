'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileImage } from 'lucide-react';
import SignatureModal from '@/components/SignatureModal';
import SignatureModalv2 from './SignatureModalv2';

interface SignatureButtonProps {
  signature: string;
  onSignatureChange: (signature: string) => void;
  signerName: string;
}

export default function SignatureButton({ signature, onSignatureChange, signerName }: SignatureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 text-sm"
        >
          <FileImage className="w-3 h-3" />
          {signature ? 'View' : 'Sign'}
        </Button>
        {signature && (
          <span className="text-xs text-green-600">Signed</span>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] md:max-w-4xl overflow-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Signature for {signerName}</DialogTitle>
          </DialogHeader>
          <SignatureModalv2
            signature={signature}
            onSignatureChange={onSignatureChange}
            signerName={signerName}
            modalTitle=""
            modalDescription="Please sign below to confirm"
            signatureLabel=""
            required={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}