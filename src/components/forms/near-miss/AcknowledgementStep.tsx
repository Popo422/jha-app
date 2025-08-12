'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Expand, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface AcknowledgementStepProps {
  data: {
    reporterSignature: string;
    reporterDate: string;
    supervisorSignature: string;
    supervisorDate: string;
    reportedBy: string;
    supervisor: string;
  };
  updateData: (updates: Partial<{
    reporterSignature: string;
    reporterDate: string;
    supervisorSignature: string;
    supervisorDate: string;
    reportedBy: string;
    supervisor: string;
  }>) => void;
  onSubmit: () => void;
}

export default function AcknowledgementStep({ data, updateData, onSubmit }: AcknowledgementStepProps) {
  const { t } = useTranslation('common');
  const reporterCanvasRef = useRef<SignatureCanvas>(null);
  const supervisorCanvasRef = useRef<SignatureCanvas>(null);
  const reporterModalCanvasRef = useRef<SignatureCanvas>(null);
  const supervisorModalCanvasRef = useRef<SignatureCanvas>(null);
  
  const [reporterModalOpen, setReporterModalOpen] = useState(false);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [isLoadingReporterSignature, setIsLoadingReporterSignature] = useState(false);
  const [isLoadingSupervisorSignature, setIsLoadingSupervisorSignature] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    updateData({ [field]: value });
  };

  const handleReporterSignatureEnd = () => {
    if (reporterCanvasRef.current && !isLoadingReporterSignature) {
      const signature = reporterCanvasRef.current.toDataURL();
      updateData({ reporterSignature: signature });
    }
  };

  const handleSupervisorSignatureEnd = () => {
    if (supervisorCanvasRef.current && !isLoadingSupervisorSignature) {
      const signature = supervisorCanvasRef.current.toDataURL();
      updateData({ supervisorSignature: signature });
    }
  };

  const clearReporterSignature = () => {
    if (reporterCanvasRef.current) {
      reporterCanvasRef.current.clear();
      updateData({ reporterSignature: '' });
    }
  };

  const clearSupervisorSignature = () => {
    if (supervisorCanvasRef.current) {
      supervisorCanvasRef.current.clear();
      updateData({ supervisorSignature: '' });
    }
  };


  // Load existing signatures when component mounts or data changes
  useEffect(() => {
    // Load reporter signature if it exists
    if (data.reporterSignature && reporterCanvasRef.current) {
      setIsLoadingReporterSignature(true);
      const canvas = reporterCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsLoadingReporterSignature(false);
        };
        img.onerror = () => {
          setIsLoadingReporterSignature(false);
        };
        img.src = data.reporterSignature;
      }
    }
    
    // Load supervisor signature if it exists
    if (data.supervisorSignature && supervisorCanvasRef.current) {
      setIsLoadingSupervisorSignature(true);
      const canvas = supervisorCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsLoadingSupervisorSignature(false);
        };
        img.onerror = () => {
          setIsLoadingSupervisorSignature(false);
        };
        img.src = data.supervisorSignature;
      }
    }
  }, [data.reporterSignature, data.supervisorSignature]);

  const openReporterModal = () => {
    setReporterModalOpen(true);
    // Copy existing signature data to modal canvas
    setTimeout(() => {
      if (data.reporterSignature && reporterModalCanvasRef.current) {
        const canvas = reporterModalCanvasRef.current.getCanvas();
        const ctx = canvas.getContext('2d');
        if (ctx && data.reporterSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = data.reporterSignature;
        }
      }
    }, 100);
  };

  const closeReporterModal = () => {
    // Copy signature from modal back to main canvas
    if (reporterModalCanvasRef.current) {
      const signature = reporterModalCanvasRef.current.toDataURL();
      updateData({ reporterSignature: signature });
      
      // Update main canvas
      if (reporterCanvasRef.current) {
        const canvas = reporterCanvasRef.current.getCanvas();
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = signature;
        }
      }
    }
    setReporterModalOpen(false);
  };

  const openSupervisorModal = () => {
    setSupervisorModalOpen(true);
    // Copy existing signature data to modal canvas
    setTimeout(() => {
      if (data.supervisorSignature && supervisorModalCanvasRef.current) {
        const canvas = supervisorModalCanvasRef.current.getCanvas();
        const ctx = canvas.getContext('2d');
        if (ctx && data.supervisorSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = data.supervisorSignature;
        }
      }
    }, 100);
  };

  const closeSupervisorModal = () => {
    // Copy signature from modal back to main canvas
    if (supervisorModalCanvasRef.current) {
      const signature = supervisorModalCanvasRef.current.toDataURL();
      updateData({ supervisorSignature: signature });
      
      // Update main canvas
      if (supervisorCanvasRef.current) {
        const canvas = supervisorCanvasRef.current.getCanvas();
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = signature;
        }
      }
    }
    setSupervisorModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Acknowledgement
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          By signing below, all parties acknowledge that they have reviewed this near miss report 
          and agree that the information provided is accurate and complete.
        </p>
      </div>

      {/* Reporter Signature */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Reporter Acknowledgement</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Digital Signature</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openReporterModal}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Expand signature area"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
              <SignatureCanvas
                ref={reporterCanvasRef}
                canvasProps={{
                  width: 400,
                  height: 160,
                  className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
                }}
                onEnd={handleReporterSignatureEnd}
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center border-t pt-2">
              {data.reportedBy || 'Reporter Name'}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearReporterSignature}
              className="w-full"
            >
              Clear Signature
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reporterDate">Date Signed</Label>
            <Input
              id="reporterDate"
              type="date"
              value={data.reporterDate}
              onChange={(e) => handleInputChange('reporterDate', e.target.value)}
              required
              className="text-center"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              By signing above, I acknowledge that the information provided in this near-miss report is accurate and complete to the best of my knowledge.
            </p>
          </div>
        </div>
      </div>

      {/* Optional Supervisor Signature */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-lg font-semibold">Supervisor Review (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Digital Signature</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openSupervisorModal}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Expand signature area"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
              <SignatureCanvas
                ref={supervisorCanvasRef}
                canvasProps={{
                  width: 400,
                  height: 160,
                  className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
                }}
                onEnd={handleSupervisorSignatureEnd}
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center border-t pt-2">
              {data.supervisor || 'Supervisor Name (Optional)'}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSupervisorSignature}
              className="w-full"
            >
              Clear Signature
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisorDate">Date Signed</Label>
            <Input
              id="supervisorDate"
              type="date"
              value={data.supervisorDate}
              onChange={(e) => handleInputChange('supervisorDate', e.target.value)}
              className="text-center"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Supervisor signature indicates review and acknowledgement of this report.
            </p>
          </div>
        </div>
      </div>


      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Before Submitting:
        </h3>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Ensure all required fields are completed</li>
          <li>• Reporter signature is required</li>
          <li>• Review all information for accuracy</li>
          <li>• Once submitted, this report will be processed by management</li>
        </ul>
      </div>

      {/* Reporter Signature Modal */}
      <Dialog open={reporterModalOpen} onOpenChange={setReporterModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Reporter Digital Signature
              <Button
                variant="ghost"
                size="sm"
                onClick={closeReporterModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Sign below to acknowledge this near-miss report
            </div>
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white">
              <SignatureCanvas
                ref={reporterModalCanvasRef}
                canvasProps={{
                  width: 800,
                  height: 300,
                  className: "signature-canvas w-full border rounded bg-white"
                }}
                onEnd={() => {
                  if (reporterModalCanvasRef.current) {
                    const signature = reporterModalCanvasRef.current.toDataURL();
                    updateData({ reporterSignature: signature });
                  }
                }}
              />
            </div>
            <div className="text-center text-sm font-medium border-t pt-2">
              {data.reportedBy || 'Reporter Name'}
            </div>
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (reporterModalCanvasRef.current) {
                    reporterModalCanvasRef.current.clear();
                  }
                }}
              >
                Clear Signature
              </Button>
              <Button
                type="button"
                onClick={closeReporterModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supervisor Signature Modal */}
      <Dialog open={supervisorModalOpen} onOpenChange={setSupervisorModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Supervisor Digital Signature
              <Button
                variant="ghost"
                size="sm"
                onClick={closeSupervisorModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Sign below to acknowledge review of this near-miss report (Optional)
            </div>
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white">
              <SignatureCanvas
                ref={supervisorModalCanvasRef}
                canvasProps={{
                  width: 800,
                  height: 300,
                  className: "signature-canvas w-full border rounded bg-white"
                }}
                onEnd={() => {
                  if (supervisorModalCanvasRef.current) {
                    const signature = supervisorModalCanvasRef.current.toDataURL();
                    updateData({ supervisorSignature: signature });
                  }
                }}
              />
            </div>
            <div className="text-center text-sm font-medium border-t pt-2">
              {data.supervisor || 'Supervisor Name'}
            </div>
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (supervisorModalCanvasRef.current) {
                    supervisorModalCanvasRef.current.clear();
                  }
                }}
              >
                Clear Signature
              </Button>
              <Button
                type="button"
                onClick={closeSupervisorModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}