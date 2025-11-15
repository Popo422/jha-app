"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SignatureButton from "@/components/SignatureButton";
import { ArrowLeft, FileText, Plus, Minus } from "lucide-react";

interface CertificationFormData {
  certificationDate: string;
  projectManager: string;
  position: string;
  payrollStartDate: string;
  payrollEndDate: string;
  fringeBenefitsOption: 'plans' | 'cash';
  exceptions: { exception: string; explanation: string }[];
  remarks: string;
  signature: string;
}

interface CertificationFormStepProps {
  initialData: CertificationFormData;
  onNext: (data: CertificationFormData) => void;
  onBack: () => void;
}

export default function CertificationFormStep({ 
  initialData, 
  onNext, 
  onBack 
}: CertificationFormStepProps) {
  const [formData, setFormData] = useState<CertificationFormData>(initialData);

  const addException = () => {
    setFormData({
      ...formData,
      exceptions: [...formData.exceptions, { exception: '', explanation: '' }]
    });
  };

  const removeException = (index: number) => {
    setFormData({
      ...formData,
      exceptions: formData.exceptions.filter((_, i) => i !== index)
    });
  };

  const updateException = (index: number, field: 'exception' | 'explanation', value: string) => {
    const updatedExceptions = formData.exceptions.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setFormData({ ...formData, exceptions: updatedExceptions });
  };

  const handleSubmit = () => {
    if (isValid) {
      onNext(formData);
    }
  };

  const isValid = formData.certificationDate &&
                  formData.projectManager && 
                  formData.position && 
                  formData.payrollStartDate &&
                  formData.payrollEndDate && 
                  formData.fringeBenefitsOption &&
                  formData.signature;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Certification Statement</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fill out the certification statement for the certified payroll
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
        <div className="space-y-8">
          {/* Certification Date */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Certification Date</h4>
            <div className="space-y-2">
              <label htmlFor="certificationDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date *
              </label>
              <Input
                id="certificationDate"
                type="date"
                value={formData.certificationDate}
                onChange={(e) => setFormData({ ...formData, certificationDate: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Basic Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="projectManager" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Manager *
                </label>
                <Input
                  id="projectManager"
                  value={formData.projectManager}
                  onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                  placeholder="Enter project manager name"
                  required
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Position *
                </label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Enter position/title"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="payrollStartDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payroll Start Date *
                </label>
                <Input
                  id="payrollStartDate"
                  type="date"
                  value={formData.payrollStartDate}
                  onChange={(e) => setFormData({ ...formData, payrollStartDate: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payrollEndDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payroll End Date *
                </label>
                <Input
                  id="payrollEndDate"
                  type="date"
                  value={formData.payrollEndDate}
                  onChange={(e) => setFormData({ ...formData, payrollEndDate: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Fringe Benefits Payment Method */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Fringe Benefits Payment Method</h4>
            <RadioGroup 
              value={formData.fringeBenefitsOption} 
              onValueChange={(value: 'plans' | 'cash') => setFormData({ ...formData, fringeBenefitsOption: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plans" id="plans" />
                <label htmlFor="plans" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fringe benefits are paid to approved plans, funds or programs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <label htmlFor="cash" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fringe benefits are paid in cash
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Exceptions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Exceptions (Craft) & Explanation</h4>
              <Button
                type="button"
                onClick={addException}
                variant="outline"
                className="text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exception
              </Button>
            </div>
            
            {formData.exceptions.length === 0 ? (
              <p className="text-sm text-gray-500">No exceptions added</p>
            ) : (
              <div className="space-y-4">
                {formData.exceptions.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Exception (Craft)
                      </label>
                      <Input
                        value={item.exception}
                        onChange={(e) => updateException(index, 'exception', e.target.value)}
                        placeholder="Enter craft exception"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Explanation
                        </label>
                        <Button
                          type="button"
                          onClick={() => removeException(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={item.explanation}
                        onChange={(e) => updateException(index, 'explanation', e.target.value)}
                        placeholder="Enter explanation"
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Remarks</h4>
            <div className="space-y-2">
              <label htmlFor="remarks" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Comments
              </label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Enter any additional remarks"
                rows={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Signature Section */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Digital Signature</h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Digital Signature *
              </label>
              <SignatureButton
                signature={formData.signature}
                onSignatureChange={(signature) => setFormData({ ...formData, signature })}
                signerName={formData.projectManager || "Signatory"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Outside the content box like other steps */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="bg-black hover:bg-gray-800 text-white"
        >
          Next
        </Button>
      </div>
    </div>
  );
}