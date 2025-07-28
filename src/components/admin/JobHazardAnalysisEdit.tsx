"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateSubmissionMutation, useDeleteAttachmentMutation } from "@/lib/features/submissions/submissionsApi";
import HazardIdentificationSection from "@/components/forms/HazardIdentificationSection";
import PPERequirementsSection from "@/components/forms/PPERequirementsSection";
import FallProtectionSection from "@/components/forms/FallProtectionSection";
import { ArrowLeft } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SupervisorSelect from "@/components/SupervisorSelect";

interface Submission {
  id: string;
  userId: string;
  completedBy: string;
  date: string;
  dateTimeClocked?: string;
  company: string;
  projectName: string;
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
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState(submission.formData);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [updateSubmission, { isLoading }] = useUpdateSubmissionMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { toast, showToast, hideToast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);

  // Load main signature into canvas when component mounts
  useEffect(() => {
    if (formData.signature && signatureRef.current) {
      setIsLoadingSignature(true);
      const canvas = signatureRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsLoadingSignature(false);
        };
        img.onerror = () => {
          setIsLoadingSignature(false);
        };
        img.src = formData.signature;
      }
    }
  }, [formData.signature]);

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
    if (signatureRef.current && !isLoadingSignature) {
      try {
        const signatureData = signatureRef.current.toDataURL();
        setFormData((prev: any) => ({
          ...prev,
          signature: signatureData,
        }));
      } catch (error) {
        console.warn('Could not export signature - canvas may be tainted');
      }
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

  const handleDeleteAttachment = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      setDeletingFiles(prev => new Set(prev).add(fileUrl));
      
      const result = await deleteAttachment({
        submissionId: submission.id,
        fileUrl,
        fileName
      }).unwrap();

      if (result.success) {
        // Remove the file from local state
        setFormData((prev: any) => ({
          ...prev,
          uploadedFiles: (prev.uploadedFiles || []).filter((file: any) => file.url !== fileUrl)
        }));
        showToast(t('common.attachmentDeletedSuccessfully'), 'success');
      } else {
        showToast(result.error || t('common.failedToDeleteAttachment'), 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || t('common.failedToDeleteAttachment'), 'error');
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
    }
  }, [submission.id, deleteAttachment, showToast]);

  const handleSave = useCallback(async () => {
    try {
      const result = await updateSubmission({
        id: submission.id,
        completedBy: formData.completedBy,
        date: formData.date,
        company: formData.company,
        projectName: formData.projectName,
        formData: formData,
        authType: 'admin'
      }).unwrap();

      if (result.success) {
        showToast(t('common.changesSavedSuccessfully'), 'success');
      } else {
        showToast(result.error || t('common.failedToSaveChanges'), 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || t('common.failedToSaveChanges'), 'error');
    }
  }, [formData, submission.id, updateSubmission, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{t('common.edit')} {t('forms.jobHazardAnalysis')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('forms.reportDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <ContractorSelect
                id="completedBy"
                name="completedBy"
                value={formData.completedBy || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('formFields.date')}</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <SupervisorSelect
                id="supervisor"
                name="supervisor"
                label={t('formFields.supervisor')}
                value={formData.supervisor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">{t('formFields.company')}</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <ProjectSelect
                id="projectName"
                name="projectName"
                value={formData.projectName || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                label={t('formFields.projectName')}
                placeholder="Name or title of the project"
                required
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
              <CardTitle>{t('safety.toolInspection')}</CardTitle>
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
                    <Label htmlFor="powerToolsGFCI-yes">{t('common.yes')}</Label>
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
                    <Label htmlFor="powerToolsGFCI-no">{t('common.no')}</Label>
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
                    <Label htmlFor="usingLadder-yes">{t('common.yes')}</Label>
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
                    <Label htmlFor="usingLadder-no">{t('common.no')}</Label>
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
                <CardTitle>{t('safety.generalLadderSafety')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'ladderAltered',
                  'weatherCompromised',
                  'housekeeping',
                  'rungsClean',
                  'feetPositioned',
                  'livePowerPrecautions',
                  'threePointContact',
                  'overheadObstructions',
                  'stableSurface',
                  'facingLadder'
                ].map((questionKey) => (
                  <div key={questionKey} className="space-y-2">
                    <Label className="font-medium">{t(`safetyQuestions.${questionKey}`)}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-yes`}
                          name={questionKey}
                          value="true"
                          checked={formData[questionKey] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-yes`}>{t('common.yes')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-no`}
                          name={questionKey}
                          value="false"
                          checked={formData[questionKey] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-no`}>{t('common.no')}</Label>
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
                <CardTitle>{t('safety.stepLadderInspection')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'stepsCondition',
                  'labelsReadable',
                  'topCondition',
                  'spreaderCondition',
                  'generalCondition',
                  'bracingCondition'
                ].map((questionKey) => (
                  <div key={questionKey} className="space-y-2">
                    <Label className="font-medium">{t(`safetyQuestions.${questionKey}`)}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-yes`}
                          name={questionKey}
                          value="true"
                          checked={formData[questionKey] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-yes`}>{t('common.yes')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-no`}
                          name={questionKey}
                          value="false"
                          checked={formData[questionKey] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-no`}>{t('common.no')}</Label>
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
                <CardTitle>{t('safety.extensionLadderInspection')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'rungsCondition',
                  'railsCondition',
                  'labelsReadable',
                  'hardwareCondition',
                  'shoesCondition',
                  'ropePulleyCondition',
                  'bracingCondition',
                  'generalCondition',
                  'extendedHeight',
                  'tieOff',
                  'positioning',
                  'reach',
                  'height'
                ].map((questionKey) => (
                  <div key={questionKey} className="space-y-2">
                    <Label className="font-medium">{t(`safetyQuestions.${questionKey}`)}</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-yes`}
                          name={questionKey}
                          value="true"
                          checked={formData[questionKey] === true}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-yes`}>{t('common.yes')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${questionKey}-no`}
                          name={questionKey}
                          value="false"
                          checked={formData[questionKey] === false}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${questionKey}-no`}>{t('common.no')}</Label>
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
              <CardTitle>{t('safety.additionalSafetyMeasures')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                'warmUpStretch',
                'lockoutTagout',
                'energizedWorkPermit',
                'emergencyPlan',
                'emergencyPlanReviewed',
                'fireExtinguisher',
                'firstAidKit'
              ].map((questionKey) => (
                <div key={questionKey} className="space-y-2">
                  <Label className="font-medium">{t(`safetyQuestions.${questionKey}`)}</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${questionKey}-yes`}
                        name={questionKey}
                        value="true"
                        checked={formData[questionKey] === true}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`${questionKey}-yes`}>{t('common.yes')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${questionKey}-no`}
                        name={questionKey}
                        value="false"
                        checked={formData[questionKey] === false}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`${questionKey}-no`}>{t('common.no')}</Label>
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

          {/* File Attachments Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminEdit.fileAttachments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Attached Files:</Label>
                {formData.uploadedFiles && formData.uploadedFiles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.uploadedFiles.map((file: any, index: number) => (
                      <AttachmentPreview
                        key={index}
                        file={{
                          name: file.filename,
                          url: file.url,
                          filename: file.filename
                        }}
                        showDeleteButton={true}
                        onDelete={() => handleDeleteAttachment(file.url, file.filename)}
                        isDeleting={deletingFiles.has(file.url)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('common.no')} files attached</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.digitalSignature')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Employee Signature:</Label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 400,
                      height: 200,
                      className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
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
                    {t('forms.clearSignature')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('common.save') + '...' : t('common.save') + ' Changes'}
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