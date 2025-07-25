"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateSubmissionMutation, useDeleteAttachmentMutation } from "@/lib/features/submissions/submissionsApi";
import { ArrowLeft } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store";

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

interface EndOfDayEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function EndOfDayEdit({ submission, onBack }: EndOfDayEditProps) {
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
  
  const auth = useSelector((state: RootState) => state.auth);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "radio") {
      const booleanValue = value === "true" ? true : value === "false" ? false : null;
      setFormData((prev: any) => ({
        ...prev,
        [name]: booleanValue,
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

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
      // Prepare dateTimeClocked - combine date with time if time is provided
      let dateTimeClocked = null;
      if (formData.timeClocked && formData.date) {
        dateTimeClocked = `${formData.date}T${formData.timeClocked}:00`;
      }else{
        dateTimeClocked = submission.dateTimeClocked
      }

      const result = await updateSubmission({
        id: submission.id,
        completedBy: formData.completedBy,
        date: formData.date,
        company: formData.company,
        projectName: formData.projectName,
        dateTimeClocked: dateTimeClocked,
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
        <h2 className="text-2xl font-bold">{t('admin.editEndOfDayReport')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminEdit.reportDetails')}</CardTitle>
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
              <Label htmlFor="date">{t('formFields.date')}:</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor">{t('formFields.supervisor')}:</Label>
              <Input
                id="supervisor"
                name="supervisor"
                value={formData.supervisor || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">{t('formFields.company')}:</Label>
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
            <div className="space-y-2">
              <Label htmlFor="timeClocked">{t('adminEdit.timeClockedOut')}:</Label>
              <Input
                id="timeClocked"
                name="timeClocked"
                type="time"
                value={formData.timeClocked || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Instructions:</strong> {`Any injuries or COVID-19 related symptoms must be reported to your supervisor immediately. Please Answer "Yes" or "No"`}
            </p>
          </div>

          {/* Health Questions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminEdit.endOfDayHealthSafetyCheck')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Free from injury */}
              <div className="space-y-2">
                <Label className="font-medium">{t('adminEdit.leavingJobSiteFreeFromInjuries')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injury-yes"
                      name="freeFromInjury"
                      value="true"
                      checked={formData.freeFromInjury === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injury-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injury-no"
                      name="freeFromInjury"
                      value="false"
                      checked={formData.freeFromInjury === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injury-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Completed JHA */}
              <div className="space-y-2">
                <Label className="font-medium">{t('adminEdit.completedJHAToday')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="jha-yes"
                      name="completedJHA"
                      value="true"
                      checked={formData.completedJHA === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="jha-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="jha-no"
                      name="completedJHA"
                      value="false"
                      checked={formData.completedJHA === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="jha-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Free from fever */}
              <div className="space-y-2">
                <Label className="font-medium">{t('adminEdit.freeFromFeverReporting')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="fever-yes"
                      name="freeFromFever"
                      value="true"
                      checked={formData.freeFromFever === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="fever-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="fever-no"
                      name="freeFromFever"
                      value="false"
                      checked={formData.freeFromFever === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="fever-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Free from COVID symptoms */}
              <div className="space-y-2">
                <Label className="font-medium">
                  {t('adminEdit.freeFromCovidSymptomsReporting')}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="covid-symptoms-yes"
                      name="freeFromCovidSymptoms"
                      value="true"
                      checked={formData.freeFromCovidSymptoms === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="covid-symptoms-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="covid-symptoms-no"
                      name="freeFromCovidSymptoms"
                      value="false"
                      checked={formData.freeFromCovidSymptoms === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="covid-symptoms-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Free from direct exposure */}
              <div className="space-y-2">
                <Label className="font-medium">
                  {t('adminEdit.freeFromDirectCovidExposure')}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="exposure-yes"
                      name="freeFromDirectExposure"
                      value="true"
                      checked={formData.freeFromDirectExposure === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="exposure-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="exposure-no"
                      name="freeFromDirectExposure"
                      value="false"
                      checked={formData.freeFromDirectExposure === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="exposure-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Travel question */}
              <div className="space-y-2">
                <Label className="font-medium">
                  {t('adminEdit.traveledOutOfCountryHotspot')}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="travel-yes"
                      name="traveledOutOfCountry"
                      value="true"
                      checked={formData.traveledOutOfCountry === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="travel-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="travel-no"
                      name="traveledOutOfCountry"
                      value="false"
                      checked={formData.traveledOutOfCountry === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="travel-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
              </div>

              {/* Physical distancing */}
              <div className="space-y-2">
                <Label className="font-medium">
                  {t('adminEdit.physicalDistancingAndSanitaryAgents')}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="distancing-yes"
                      name="physicalDistancing"
                      value="true"
                      checked={formData.physicalDistancing === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="distancing-yes">{t('adminEdit.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="distancing-no"
                      name="physicalDistancing"
                      value="false"
                      checked={formData.physicalDistancing === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="distancing-no">{t('adminEdit.no')}</Label>
                  </div>
                </div>
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
                <Label>{t('adminEdit.attachedFiles')}:</Label>
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
                  <p className="text-sm text-gray-500">{t('adminEdit.noFilesAttached')}</p>
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
                <Label>{t('adminEdit.employeeSignature')}:</Label>
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
            <Button variant="outline" onClick={onBack}>{t('adminEdit.cancel')}</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('adminEdit.saving') : t('adminEdit.saveChanges')}
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