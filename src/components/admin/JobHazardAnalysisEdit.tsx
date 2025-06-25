"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateSubmissionMutation } from "@/lib/features/submissions/submissionsApi";
import HazardIdentificationSection from "@/components/forms/HazardIdentificationSection";
import PPERequirementsSection from "@/components/forms/PPERequirementsSection";
import FallProtectionSection from "@/components/forms/FallProtectionSection";
import { ArrowLeft } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface Submission {
  id: string;
  userId: string;
  completedBy: string;
  date: string;
  dateTimeClocked?: string;
  company: string;
  jobSite: string;
  submissionType: string;
  formData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface JobHazardAnalysisEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function JobHazardAnalysisEdit({ submission, onBack }: JobHazardAnalysisEditProps) {
  const [formData, setFormData] = useState(submission.formData);
  const [updateSubmission, { isLoading }] = useUpdateSubmissionMutation();
  const { toast, showToast, hideToast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    let fieldValue: any = value;
    if (type === "checkbox") {
      fieldValue = checked;
    } else if (type === "radio") {
      fieldValue = value === "true" ? true : value === "false" ? false : value;
    }
    
    if (name.includes(".")) {
      const [section, field] = name.split(".");
      setFormData((prev: any) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: fieldValue,
        },
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: fieldValue,
      }));
    }
  }, []);

  const handleCheckboxArrayChange = useCallback((section: string, field: string, value: string, checked: boolean) => {
    setFormData((prev: any) => {
      const sectionData = prev[section];
      const currentArray = sectionData[field] as string[];
      const newArray = checked ? [...currentArray, value] : currentArray.filter((item: string) => item !== value);

      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: newArray,
        },
      };
    });
  }, []);

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev: any) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev: any) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  };

  const handleSignatureStart = () => {
    // If there's an existing signature URL (not base64), clear it when user starts drawing
    if (formData.signature && !formData.signature.startsWith('data:image/')) {
      setFormData((prev: any) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleSave = useCallback(async () => {
    try {
      const result = await updateSubmission({
        id: submission.id,
        completedBy: formData.completedBy,
        date: formData.date,
        company: formData.company,
        jobSite: submission.jobSite,
        formData: formData
      }).unwrap();

      if (result.success) {
        showToast('Changes saved successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to save changes', 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to save changes', 'error');
    }
  }, [formData, submission.id, submission.jobSite, updateSubmission, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Edit Job Hazard Analysis</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="completedBy">Completed by:</Label>
              <Input
                id="completedBy"
                name="completedBy"
                value={formData.completedBy || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor">Supervisor:</Label>
              <Input
                id="supervisor"
                name="supervisor"
                value={formData.supervisor || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company:</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Form Sections */}
          <HazardIdentificationSection hazards={formData.hazards || {}} onChange={handleInputChange} />
          <PPERequirementsSection ppe={formData.ppe || {}} onChange={handleInputChange} />
          <FallProtectionSection 
            fallProtection={formData.fallProtection || {}} 
            siteSpecificSafety={formData.siteSpecificSafety || false}
            onChange={handleInputChange} 
          />

          {/* Tool Inspection Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tool Inspection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Are power tools and equipment protected by GFCI?</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="powerToolsGFCI-yes"
                      name="powerToolsGFCI"
                      value="true"
                      checked={formData.powerToolsGFCI === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="powerToolsGFCI-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="powerToolsGFCI-no"
                      name="powerToolsGFCI"
                      value="false"
                      checked={formData.powerToolsGFCI === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="powerToolsGFCI-no">No</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Are you using a ladder for this job?</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="usingLadder-yes"
                      name="usingLadder"
                      value="true"
                      checked={formData.usingLadder === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="usingLadder-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="usingLadder-no"
                      name="usingLadder"
                      value="false"
                      checked={formData.usingLadder === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="usingLadder-no">No</Label>
                  </div>
                </div>
              </div>

              {formData.usingLadder === true && (
                <div className="space-y-2">
                  <Label className="font-medium">Type of ladder (check all that apply):</Label>
                  <div className="space-y-2">
                    {['Step', 'Extension', 'Both'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`ladderType-${type}`}
                          checked={(formData.ladderType || []).includes(type)}
                          onChange={(e) => handleCheckboxArrayChange('', 'ladderType', type, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`ladderType-${type}`}>{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Ladder Safety */}
          {formData.usingLadder === true && (
            <Card>
              <CardHeader>
                <CardTitle>General Ladder Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'ladderAltered', label: 'Has the ladder been altered in any way?' },
                  { key: 'weatherCompromised', label: 'Is the ladder compromised by weather conditions?' },
                  { key: 'housekeeping', label: 'Is housekeeping adequate around the ladder area?' },
                  { key: 'rungsClean', label: 'Are ladder rungs clean and free of slippery materials?' },
                  { key: 'feetPositioned', label: 'Are your feet positioned properly on the rungs?' },
                  { key: 'livePowerPrecautions', label: 'Have you taken precautions around live power?' },
                  { key: 'threePointContact', label: 'Are you maintaining three-point contact?' },
                  { key: 'overheadObstructions', label: 'Are there overhead obstructions?' },
                  { key: 'stableSurface', label: 'Is the ladder on a stable surface?' },
                  { key: 'facingLadder', label: 'Are you facing the ladder when climbing?' }
                ].map((question) => (
                  <div key={question.key} className="space-y-2">
                    <Label className="font-medium">{question.label}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-yes`}
                          name={question.key}
                          value="true"
                          checked={formData[question.key] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-no`}
                          name={question.key}
                          value="false"
                          checked={formData[question.key] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-no`}>No</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step Ladder Inspection */}
          {formData.usingLadder === true && (formData.ladderType || []).includes('Step') && (
            <Card>
              <CardHeader>
                <CardTitle>Step Ladder Inspection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'stepsCondition', label: 'Steps/rungs in good condition?' },
                  { key: 'labelsReadable', label: 'All labels readable?' },
                  { key: 'topCondition', label: 'Top platform in good condition?' },
                  { key: 'spreaderCondition', label: 'Spreader/locking mechanism working properly?' },
                  { key: 'generalCondition', label: 'General condition acceptable?' },
                  { key: 'bracingCondition', label: 'All bracing and hardware tight?' }
                ].map((question) => (
                  <div key={question.key} className="space-y-2">
                    <Label className="font-medium">{question.label}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-yes`}
                          name={question.key}
                          value="true"
                          checked={formData[question.key] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-no`}
                          name={question.key}
                          value="false"
                          checked={formData[question.key] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-no`}>No</Label>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2">
                  <Label htmlFor="other">Other:</Label>
                  <Input
                    id="other"
                    name="other"
                    value={formData.other || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="details">Details:</Label>
                  <Textarea
                    id="details"
                    name="details"
                    value={formData.details || ''}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extension Ladder Inspection */}
          {formData.usingLadder === true && (formData.ladderType || []).includes('Extension') && (
            <Card>
              <CardHeader>
                <CardTitle>Extension Ladder Inspection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'rungsCondition', label: 'Rungs in good condition?' },
                  { key: 'railsCondition', label: 'Rails in good condition?' },
                  { key: 'labelsReadable', label: 'All labels readable?' },
                  { key: 'hardwareCondition', label: 'Hardware in good condition?' },
                  { key: 'shoesCondition', label: 'Shoes in good condition?' },
                  { key: 'ropePulleyCondition', label: 'Rope and pulley in good condition?' },
                  { key: 'bracingCondition', label: 'All bracing and hardware tight?' },
                  { key: 'generalCondition', label: 'General condition acceptable?' },
                  { key: 'extendedHeight', label: 'Extended no more than 3 feet above support?' },
                  { key: 'tieOff', label: 'Tied off at the top?' },
                  { key: 'positioning', label: 'Positioned at proper angle (4:1 ratio)?' },
                  { key: 'reach', label: 'Reach from ladder is limited?' },
                  { key: 'height', label: 'Height of ladder is adequate for the job?' }
                ].map((question) => (
                  <div key={question.key} className="space-y-2">
                    <Label className="font-medium">{question.label}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-yes`}
                          name={question.key}
                          value="true"
                          checked={formData[question.key] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.key}-no`}
                          name={question.key}
                          value="false"
                          checked={formData[question.key] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.key}-no`}>No</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Additional Safety Measures */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Safety Measures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'warmUpStretch', label: 'Did you warm up and stretch before starting work?' },
                { key: 'lockoutTagout', label: 'Is lockout/tagout required for this job?' },
                { key: 'energizedWorkPermit', label: 'Do you have an energized work permit if required?' },
                { key: 'emergencyPlan', label: 'Is there an emergency action plan for this job?' },
                { key: 'emergencyPlanReviewed', label: 'Has the emergency action plan been reviewed?' },
                { key: 'fireExtinguisher', label: 'Is a fire extinguisher readily available?' },
                { key: 'firstAidKit', label: 'Is a first aid kit readily available?' }
              ].map((question) => (
                <div key={question.key} className="space-y-2">
                  <Label className="font-medium">{question.label}</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${question.key}-yes`}
                        name={question.key}
                        value="true"
                        checked={formData[question.key] === true}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`${question.key}-yes`}>Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${question.key}-no`}
                        name={question.key}
                        value="false"
                        checked={formData[question.key] === false}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`${question.key}-no`}>No</Label>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes:</Label>
                <Textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes || ''}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Any additional safety considerations or notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Employee Signature:</Label>
                <div className="border border-gray-300 rounded-lg p-2 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 400,
                      height: 200,
                      className: "signature-canvas w-full max-w-md mx-auto border rounded"
                    }}
                    onBegin={handleSignatureStart}
                    onEnd={handleSignatureEnd}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSignatureClear}
                    className="text-sm"
                  >
                    Clear Signature
                  </Button>
                </div>
                {formData.signature && (
                  <div className="mt-2">
                    <Label>Current Signature:</Label>
                    <div className="border border-gray-200 rounded p-2">
                      <img src={formData.signature} alt="Current signature" className="max-w-md max-h-40" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}