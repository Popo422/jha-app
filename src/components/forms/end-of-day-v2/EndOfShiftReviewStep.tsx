"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import SignatureButton from '@/components/SignatureButton';

interface EndOfDayV2FormData {
  nearMissesIncidents: string;
  cleanupConfirmation: string;
  performDifferently: string;
  additionalEquipment: string;
  supervisorSignature: string;
  supervisorName: string;
  [key: string]: any;
}

interface EndOfShiftReviewStepProps {
  data: EndOfDayV2FormData;
  updateData: (updates: Partial<EndOfDayV2FormData>) => void;
  onSubmit: () => void;
}

export default function EndOfShiftReviewStep({ data, updateData, onSubmit }: EndOfShiftReviewStepProps) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          End of Shift Review
        </h2>
      </div>

      <div className="space-y-6">
        {/* Review Questions */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Did any near-misses, incidents, or issue requiring re-work occur today?</Label>
            <Textarea
              value={data.nearMissesIncidents}
              onChange={(e) => updateData({ nearMissesIncidents: e.target.value })}
              placeholder="Enter Information"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Did we clean up our work area and secure all tools, equipment and materials?</Label>
            <Textarea
              value={data.cleanupConfirmation}
              onChange={(e) => updateData({ cleanupConfirmation: e.target.value })}
              placeholder="Enter Information"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>What did we do today, that should be performed differently tomorrow?</Label>
            <Textarea
              value={data.performDifferently}
              onChange={(e) => updateData({ performDifferently: e.target.value })}
              placeholder="Enter Information"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>What added equip., tools, training / support do we need tomorrow?</Label>
            <Textarea
              value={data.additionalEquipment}
              onChange={(e) => updateData({ additionalEquipment: e.target.value })}
              placeholder="Enter Information"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Digital Signature Section */}
        <Card className="border-2 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Digital Signature
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Print Name *</Label>
                <Input
                  value={data.supervisorName}
                  onChange={(e) => updateData({ supervisorName: e.target.value })}
                  placeholder="Enter Your Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Please sign below to confirm the accuracy of this analysis *</Label>
                <SignatureButton
                  signature={data.supervisorSignature}
                  onSignatureChange={(signature) => updateData({ supervisorSignature: signature })}
                  signerName={data.supervisorName}
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="confirmation"
                  checked={!!(data.supervisorSignature && data.supervisorName)}
                  disabled
                />
                <Label htmlFor="confirmation" className="text-sm leading-relaxed">
                  By signing, I confirm that the information provided is true and accurate.
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}