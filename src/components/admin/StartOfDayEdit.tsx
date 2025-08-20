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
import { ArrowLeft } from "lucide-react";
import SignatureModal from "@/components/SignatureModal";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SubcontractorSelect from "@/components/SubcontractorSelect";
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

interface StartOfDayEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function StartOfDayEdit({ submission, onBack }: StartOfDayEditProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState(submission.formData);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [updateSubmission, { isLoading }] = useUpdateSubmissionMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { toast, showToast, hideToast } = useToast();

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

  const handleSignatureChange = (signature: string) => {
    setFormData((prev: any) => ({
      ...prev,
      signature,
    }));
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
        <h2 className="text-2xl font-bold">{t('admin.editStartOfDayReport')}</h2>
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
                authType="admin"
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
                authType="admin"
              />
            </div>
            <div className="space-y-2">
              <SubcontractorSelect
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                label={t('admin.companySubcontractor')}
                authType="admin"
              />
            </div>
            <div className="space-y-2">
              <ProjectSelect
                id="projectName"
                name="projectName"
                value={formData.projectName || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                label={t('formFields.projectName')}
                placeholder={t('formFields.projectNamePlaceholder')}
                required
                authType="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeClocked">{t('formFields.timeClockedIn')}</Label>
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
              <CardTitle>{t('adminEdit.healthAndSafetyCheck')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Free from injury */}
              <div className="space-y-2">
                <Label className="font-medium">{t('adminEdit.freeFromInjuryReporting')}</Label>
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
                
                {/* Conditional explanation field */}
                {formData.traveledOutOfCountry === true && (
                  <div className="mt-3 space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                        {t('formFields.followUpQuestion')}
                      </span>
                    </div>
                    <Label htmlFor="travelExplanation" className="text-sm font-medium">
                      {t('adminEdit.explanation')}:
                    </Label>
                    <Textarea
                      id="travelExplanation"
                      name="travelExplanation"
                      value={formData.travelExplanation || ''}
                      onChange={handleInputChange}
                      placeholder={t('adminEdit.travelDetailsPlaceholder')}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                )}
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
            <CardContent>
              <SignatureModal
                signature={formData.signature}
                onSignatureChange={handleSignatureChange}
                signerName={formData.completedBy || 'Signature'}
                modalTitle={`${t('forms.startOfDayReport')} - ${t('forms.digitalSignature')} (Admin Edit)`}
                modalDescription={t('adminEdit.employeeSignature')}
                signatureLabel={`${t('adminEdit.employeeSignature')}:`}
                required
              />
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