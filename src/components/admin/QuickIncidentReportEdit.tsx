"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";
import { useDeleteAttachmentMutation } from "@/lib/features/submissions/submissionsApi";
import { Incident, useUpdateIncidentMutation } from "@/lib/features/incidents/incidentsApi";
import { workersCompApi } from "@/lib/features/workers-comp/workersCompApi";
import { useDispatch } from 'react-redux';
import { ArrowLeft } from "lucide-react";
import SignatureModal from "@/components/SignatureModal";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";

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

interface QuickIncidentReportEditProps {
  submission: Incident;
  onBack: () => void;
}

export default function QuickIncidentReportEdit({ submission, onBack }: QuickIncidentReportEditProps) {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const [formData, setFormData] = useState(submission.formData || {});
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [updateIncident, { isLoading }] = useUpdateIncidentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { toast, showToast, hideToast } = useToast();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

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
      const result = await updateIncident({
        id: submission.id,
        reportedBy: formData.completedBy,
        injuredEmployee: formData.injuredParty,
        projectName: formData.projectName,
        dateOfIncident: formData.reportDate,
        company: formData.companySubcontractor,
        formData: formData,
        authType: 'admin'
      }).unwrap();

      if (result.success) {
        // Manually refetch workers-comp data
        dispatch(workersCompApi.util.invalidateTags(['WorkersCompData']));
        showToast(t('common.changesSavedSuccessfully'), 'success');
      } else {
        showToast(result.error || t('common.failedToSaveChanges'), 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || t('common.failedToSaveChanges'), 'error');
    }
  }, [formData, submission.id, updateIncident, showToast, dispatch]);

  const handleBack = useCallback(() => {
    // Refetch workers-comp data when navigating back (in case changes were made)
    dispatch(workersCompApi.util.invalidateTags(['WorkersCompData']));
    onBack();
  }, [onBack, dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{t('common.edit')} {t('forms.quickIncidentReport')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('forms.quickReportDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Incident Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <ContractorSelect
                id="completedBy"
                name="completedBy"
                label={t('forms.completedBy')}
                value={formData.completedBy || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                authType="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDate">{t('forms.reportDate')}</Label>
              <Input
                id="reportDate"
                name="reportDate"
                type="date"
                value={formData.reportDate || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <ProjectSelect
                id="projectName"
                name="projectName"
                label={t('forms.projectName')}
                value={formData.projectName || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                authType="admin"
              />
            </div>
            <div className="space-y-2">
              <ContractorSelect
                id="injuredPerson"
                name="injuredPerson"
                label={t('forms.injuredPerson')}
                value={formData.injuredPerson || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, injuredPerson: value }))}
                authType="admin"
              />
            </div>
          </div>

          {/* File Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.attachments')}</CardTitle>
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
                  <p className="text-sm text-gray-500">No files attached</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Person Filing Report */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.personFilingReport')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterFullName">{t('forms.fullName')}</Label>
                  <Input
                    id="reporterFullName"
                    name="reporterFullName"
                    value={formData.reporterFullName || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporterDate">{t('forms.date')}</Label>
                  <Input
                    id="reporterDate"
                    name="reporterDate"
                    type="date"
                    value={formData.reporterDate || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <SignatureModal
                signature={formData.signature}
                onSignatureChange={handleSignatureChange}
                signerName={formData.completedBy || 'Signature'}
                modalTitle={`${t('forms.quickIncidentReport')} - ${t('forms.digitalSignature')} (Admin Edit)`}
                modalDescription={t('forms.signature')}
                signatureLabel={t('forms.signature')}
                required
              />
            </CardContent>
          </Card>

          {/* ADMIN SECTION */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="text-orange-800 dark:text-orange-200">{t('forms.adminSection')}</CardTitle>
              <p className="text-sm text-orange-600 dark:text-orange-300">{t('forms.adminOnlySection')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <ContractorSelect
                    id="adminReportReviewedBy"
                    name="adminReportReviewedBy"
                    label={t('forms.reportReviewedBy')}
                    value={formData.adminReportReviewedBy || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, adminReportReviewedBy: value }))}
                    authType="admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminReviewDate">{t('forms.date')}</Label>
                  <Input
                    id="adminReviewDate"
                    name="adminReviewDate"
                    type="date"
                    value={formData.adminReviewDate || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminFollowUpAction">{t('forms.followUpActionTaken')}</Label>
                <Textarea
                  id="adminFollowUpAction"
                  name="adminFollowUpAction"
                  value={formData.adminFollowUpAction || ''}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('forms.status')}</Label>
                <Select
                  value={formData.status || 'reported'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">{t('forms.statusReported')}</SelectItem>
                    <SelectItem value="investigating">{t('forms.statusInvestigating')}</SelectItem>
                    <SelectItem value="closed">{t('forms.statusClosed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.saveChanges')}
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