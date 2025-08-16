'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Expand, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
  /**
   * Current signature data URL
   */
  signature: string;
  /**
   * Callback when signature changes
   */
  onSignatureChange: (signature: string) => void;
  /**
   * Name to display under the signature area
   */
  signerName?: string;
  /**
   * Title for the modal
   */
  modalTitle?: string;
  /**
   * Description text in the modal
   */
  modalDescription?: string;
  /**
   * Label for the signature area
   */
  signatureLabel?: string;
  /**
   * Whether signature is required
   */
  required?: boolean;
  /**
   * Additional className for the main canvas
   */
  className?: string;
}

export default function SignatureModal({
  signature,
  onSignatureChange,
  signerName = 'Signature',
  modalTitle = 'Digital Signature',
  modalDescription = 'Sign below to confirm',
  signatureLabel = 'Digital Signature',
  required = false,
  className = ''
}: SignatureModalProps) {
  const mainCanvasRef = useRef<SignatureCanvas>(null);
  const modalCanvasRef = useRef<SignatureCanvas>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);

  // Load existing signature when component mounts or signature changes
  useEffect(() => {
    if (signature && mainCanvasRef.current) {
      setIsLoadingSignature(true);
      const canvas = mainCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Prevent canvas tainting
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsLoadingSignature(false);
        };
        img.onerror = () => {
          console.warn('Failed to load signature image');
          setIsLoadingSignature(false);
        };
        img.src = signature;
      }
    } else if (!signature && mainCanvasRef.current) {
      // Clear canvas and reset loading state when signature is cleared
      const canvas = mainCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setIsLoadingSignature(false);
    }
  }, [signature]);

  const handleMainSignatureEnd = () => {
    console.log('Main canvas onEnd called');
    if (mainCanvasRef.current) {
      try {
        const signatureData = mainCanvasRef.current.toDataURL();
        console.log('Main canvas signature data length:', signatureData.length);
        onSignatureChange(signatureData);
      } catch (error) {
        console.warn('Could not export signature - canvas may be tainted', error);
        // Clear the signature if it can't be exported
        onSignatureChange('');
      }
    }
  };

  const handleMainSignatureClear = () => {
    if (mainCanvasRef.current) {
      mainCanvasRef.current.clear();
      // Clear the canvas completely to remove any tainted state
      const canvas = mainCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      onSignatureChange('');
    }
  };

  const openModal = () => {
    setModalOpen(true);
    // Copy signature to modal canvas
    setTimeout(() => {
      if (modalCanvasRef.current) {
        const canvas = modalCanvasRef.current.getCanvas();
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Clear modal canvas first
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Check if main canvas has content that hasn't been saved yet
          const hasMainCanvasContent = mainCanvasRef.current && !mainCanvasRef.current.isEmpty();
          
          // If we have a saved signature and main canvas is empty (loaded state), use saved signature
          if (signature && (!hasMainCanvasContent || signature.length > 100)) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.onerror = () => {
              console.warn('Failed to load signature image');
            };
            img.src = signature;
          }
          // Otherwise, copy from main canvas if it has content
          else if (hasMainCanvasContent) {
            try {
              const currentSignature = mainCanvasRef.current.toDataURL();
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              };
              img.src = currentSignature;
            } catch (error) {
              console.warn('Could not copy signature from main canvas', error);
            }
          }
        }
      }
    }, 100);
  };

  const closeModal = () => {
    // Copy signature from modal back to main canvas only if modal has content
    if (modalCanvasRef.current) {
      try {
        const newSignature = modalCanvasRef.current.toDataURL();
        
        // Only update if modal canvas has actual content or is explicitly empty
        if (!modalCanvasRef.current.isEmpty()) {
          onSignatureChange(newSignature);
          
          // Update main canvas
          if (mainCanvasRef.current) {
            const canvas = mainCanvasRef.current.getCanvas();
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const img = new Image();
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              };
              img.src = newSignature;
            }
          }
        }
        // If modal is empty and we opened it with content from main canvas, 
        // it means user cleared it, so clear the signature
        else if (signature) {
          onSignatureChange('');
          if (mainCanvasRef.current) {
            mainCanvasRef.current.clear();
          }
        }
      } catch (error) {
        console.warn('Could not export signature - canvas may be tainted', error);
      }
    }
    setModalOpen(false);
  };

  const clearModalSignature = () => {
    if (modalCanvasRef.current) {
      modalCanvasRef.current.clear();
      onSignatureChange('');
    }
  };

  return (
    <>
      {/* Main Signature Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {signatureLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openModal}
            className="text-blue-600 hover:text-blue-700 p-1"
            title="Expand signature area"
          >
            <Expand className="h-4 w-4" />
          </Button>
        </div>
        
        <div className={`border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 ${className}`}>
          <SignatureCanvas
            ref={mainCanvasRef}
            canvasProps={{
              width: 400,
              height: 160,
              className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
            }}
            onEnd={handleMainSignatureEnd}
          />
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center border-t pt-2">
          {signerName}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMainSignatureClear}
          className="w-full"
        >
          Clear Signature
        </Button>
        
        {required && !signature && (
          <p className="text-sm text-red-600">Signature is required.</p>
        )}
      </div>

      {/* Signature Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {modalDescription}
            </div>
            
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white">
              <SignatureCanvas
                ref={modalCanvasRef}
                canvasProps={{
                  width: 800,
                  height: 300,
                  className: "signature-canvas w-full border rounded bg-white"
                }}
                onEnd={() => {
                  if (modalCanvasRef.current) {
                    try {
                      const newSignature = modalCanvasRef.current.toDataURL();
                      onSignatureChange(newSignature);
                    } catch (error) {
                      console.warn('Could not export signature - canvas may be tainted', error);
                      // Clear the signature if it can't be exported
                      onSignatureChange('');
                    }
                  }
                }}
              />
            </div>
            
            <div className="text-center text-sm font-medium border-t pt-2">
              {signerName}
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={clearModalSignature}
              >
                Clear Signature
              </Button>
              <Button
                type="button"
                onClick={closeModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}