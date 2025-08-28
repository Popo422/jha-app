"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Expand, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

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

export default function SignatureModalv2({
  signature,
  onSignatureChange,
  signerName = "Signature",
  modalTitle = "Digital Signature",
  modalDescription = "Sign below to confirm",
  signatureLabel = "Digital Signature",
  required = false,
  className = "",
}: SignatureModalProps) {
  const mainCanvasRef = useRef<SignatureCanvas>(null);
  const modalCanvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 300 });
  const [isMobile, setIsMobile] = useState(false);

  // Calculate responsive canvas size
  useEffect(() => {
    const calculateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 20; // subtract padding
        const isMobileView = window.innerWidth < 768;
        setIsMobile(isMobileView);

        if (isMobileView) {
          // Mobile: reasonable size with good aspect ratio
          const width = Math.min(containerWidth, 400); // smaller max width
          const height = Math.floor(width / 3.2); // taller aspect ratio for mobile
          
          setCanvasSize({
            width: Math.max(width, 300),
            height: Math.max(height, 120)
          });
        } else {
          // Desktop: larger size with standard aspect ratio
          const width = Math.min(containerWidth, 800);
          const height = Math.floor(width / 2.5);
          
          setCanvasSize({
            width: Math.max(width, 700),
            height: Math.max(height, 280)
          });
        }
      }
    };

    // Delay initial calculation to ensure container is rendered
    setTimeout(calculateCanvasSize, 100);
    
    window.addEventListener('resize', calculateCanvasSize);
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateCanvasSize, 100);
    });
    
    return () => {
      window.removeEventListener('resize', calculateCanvasSize);
      window.removeEventListener('orientationchange', calculateCanvasSize);
    };
  }, []);

  // Load existing signature when component mounts or signature changes
  useEffect(() => {
    if (signature && mainCanvasRef.current && canvasSize.width > 0) {
      setIsLoadingSignature(true);
      
      // Wait for canvas to be properly sized
      setTimeout(() => {
        if (mainCanvasRef.current) {
          const canvas = mainCanvasRef.current.getCanvas();
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setIsLoadingSignature(false);
            };
            img.onerror = () => {
              console.warn("Failed to load signature image");
              setIsLoadingSignature(false);
            };
            img.src = signature;
          }
        }
      }, 100); // Reduced delay
    } else if (!signature && mainCanvasRef.current) {
      const canvas = mainCanvasRef.current.getCanvas();
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setIsLoadingSignature(false);
    }
  }, [signature, canvasSize]);

  const handleMainSignatureEnd = () => {
    console.log("Main canvas onEnd called");
    if (mainCanvasRef.current) {
      try {
        const signatureData = mainCanvasRef.current.toDataURL();
        console.log("Main canvas signature data length:", signatureData.length);
        onSignatureChange(signatureData);
      } catch (error) {
        console.warn("Could not export signature - canvas may be tainted", error);
        // Clear the signature if it can't be exported
        onSignatureChange("");
      }
    }
  };

  const handleMainSignatureClear = () => {
    if (mainCanvasRef.current) {
      mainCanvasRef.current.clear();
      // Clear the canvas completely to remove any tainted state
      const canvas = mainCanvasRef.current.getCanvas();
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      onSignatureChange("");
    }
  };

  const openModal = () => {
    setModalOpen(true);
    // Copy signature to modal canvas
    setTimeout(() => {
      if (modalCanvasRef.current) {
        const canvas = modalCanvasRef.current.getCanvas();
        const ctx = canvas.getContext("2d");

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
              console.warn("Failed to load signature image");
            };
            img.src = signature;
          }
          // Otherwise, copy from main canvas if it has content
          else if (hasMainCanvasContent && mainCanvasRef.current) {
            try {
              const currentSignature = mainCanvasRef.current.toDataURL();
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              };
              img.src = currentSignature;
            } catch (error) {
              console.warn("Could not copy signature from main canvas", error);
            }
          }
        }
      }
    }, 100);
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
        </div>

        <div 
          ref={containerRef} 
          className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white w-full flex justify-center relative"
        >
          {isLoadingSignature && signature && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
              <div className="text-sm text-gray-500">Loading signature...</div>
            </div>
          )}
          <SignatureCanvas
            ref={mainCanvasRef}
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: "signature-canvas border rounded bg-white",
            }}
            onEnd={handleMainSignatureEnd}
          />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 text-center border-t pt-2">{signerName}</div>

        <Button type="button" variant="outline" size="sm" onClick={handleMainSignatureClear} className="w-full">
          Clear Signature
        </Button>

        {required && !signature && <p className="text-sm text-red-600">Signature is required.</p>}
      </div>
    </>
  );
}
