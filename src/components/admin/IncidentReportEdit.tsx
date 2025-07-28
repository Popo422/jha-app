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
import SignatureCanvas from "react-signature-canvas";
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

interface IncidentReportEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function IncidentReportEdit({ submission, onBack }: IncidentReportEditProps) {
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
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleRadioChange = useCallback((name: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
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
        date: formData.reportDate,
        company: formData.companySubcontractor,
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
        <h2 className="text-2xl font-bold">{t('common.edit')} {t('forms.incidentReport')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('forms.reportDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <ContractorSelect
                id="completedBy"
                name="completedBy"
                label={t('forms.completedBy')}
                value={formData.completedBy || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
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
              <SupervisorSelect
                id="supervisor"
                name="supervisor"
                label={t('forms.supervisor')}
                value={formData.supervisor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
              />
            </div>
            <div className="space-y-2">
              <ProjectSelect
                id="projectName"
                name="projectName"
                label={t('forms.projectName')}
                value={formData.projectName || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
              />
            </div>
            <div className="space-y-2">
              <SubcontractorSelect
                id="companySubcontractor"
                name="companySubcontractor"
                label={t('forms.companySubcontractor')}
                value={formData.companySubcontractor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, companySubcontractor: value }))}
              />
            </div>
            <div className="space-y-2">
              <ContractorSelect
                id="injuredParty"
                name="injuredParty"
                label={t('forms.injuredParty')}
                value={formData.injuredParty || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, injuredParty: value }))}
              />
            </div>
          </div>

          {/* Person Involved */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.personInvolved')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('forms.fullName')}</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('forms.phone')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">{t('forms.address')}</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('forms.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-4">
                <Label htmlFor="identification">{t('forms.identification')}</Label>
                <select
                  id="identification"
                  name="identification"
                  value={formData.identification || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('forms.selectIdentification')}</option>
                  <option value="drivers-license">{t('forms.driversLicense')}</option>
                  <option value="passport">{t('forms.passport')}</option>
                  <option value="other">{t('forms.other')}</option>
                </select>
                
                {formData.identification && (
                  <div className="space-y-2">
                    <Label htmlFor="identificationDetails">
                      {formData.identification === 'drivers-license' && t('forms.driversLicenseNo')}
                      {formData.identification === 'passport' && t('forms.passportNo')}
                      {formData.identification === 'other' && t('forms.provideDetails')}
                    </Label>
                    <Input
                      id="identificationDetails"
                      name="identificationDetails"
                      value={formData.identificationDetails || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* The Incident */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.theIncident')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">{t('forms.dateOfIncident')}</Label>
                  <Input
                    id="incidentDate"
                    name="incidentDate"
                    type="datetime-local"
                    value={formData.incidentDate || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">{t('forms.location')}</Label>
                <Textarea
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="describeIncident">{t('forms.describeIncident')}</Label>
                <Textarea
                  id="describeIncident"
                  name="describeIncident"
                  value={formData.describeIncident || ''}
                  onChange={handleInputChange}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Injuries */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.injuries')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label className="font-medium">{t('forms.wasAnyoneInjured')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injured-yes"
                      name="anyoneInjured"
                      value="Yes"
                      checked={formData.anyoneInjured === "Yes"}
                      onChange={() => handleRadioChange('anyoneInjured', "Yes")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injured-yes">{t('forms.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injured-no"
                      name="anyoneInjured"
                      value="No"
                      checked={formData.anyoneInjured === "No"}
                      onChange={() => handleRadioChange('anyoneInjured', "No")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injured-no">{t('forms.no')}</Label>
                  </div>
                </div>
              </div>

              {formData.anyoneInjured === "Yes" && (
                <div className="space-y-2">
                  <Label htmlFor="injuryDescription">{t('forms.describeInjuries')}</Label>
                  <Textarea
                    id="injuryDescription"
                    name="injuryDescription"
                    value={formData.injuryDescription || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Witnesses */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.witnesses')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label className="font-medium">{t('forms.wereThereWitnesses')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="witnesses-yes"
                      name="witnessesPresent"
                      value="Yes"
                      checked={formData.witnessesPresent === "Yes"}
                      onChange={() => handleRadioChange('witnessesPresent', "Yes")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="witnesses-yes">{t('forms.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="witnesses-no"
                      name="witnessesPresent"
                      value="No"
                      checked={formData.witnessesPresent === "No"}
                      onChange={() => handleRadioChange('witnessesPresent', "No")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="witnesses-no">{t('forms.no')}</Label>
                  </div>
                </div>
              </div>

              {formData.witnessesPresent === "Yes" && (
                <div className="space-y-2">
                  <Label htmlFor="witnessDetails">{t('forms.witnessNamesAndContact')}</Label>
                  <Textarea
                    id="witnessDetails"
                    name="witnessDetails"
                    value={formData.witnessDetails || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Police / Medical Services */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forms.policeMedicalServices')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="font-medium">{t('forms.policeNotified')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="police-yes"
                      name="policeNotified"
                      value="Yes"
                      checked={formData.policeNotified === "Yes"}
                      onChange={() => handleRadioChange('policeNotified', "Yes")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="police-yes">{t('forms.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="police-no"
                      name="policeNotified"
                      value="No"
                      checked={formData.policeNotified === "No"}
                      onChange={() => handleRadioChange('policeNotified', "No")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="police-no">{t('forms.no')}</Label>
                  </div>
                </div>
              </div>

              {formData.policeNotified === "Yes" && (
                <div className="space-y-4">
                  <Label className="font-medium">{t('forms.wasReportFiled')}</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="report-filed-yes"
                        name="reportFiled"
                        value="Yes"
                        checked={formData.reportFiled === "Yes"}
                        onChange={() => handleRadioChange('reportFiled', "Yes")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="report-filed-yes">{t('forms.yes')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="report-filed-no"
                        name="reportFiled"
                        value="No"
                        checked={formData.reportFiled === "No"}
                        onChange={() => handleRadioChange('reportFiled', "No")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="report-filed-no">{t('forms.no')}</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Label className="font-medium">{t('forms.wasMedicalTreatmentProvided')}</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="medical-yes"
                      name="medicalTreatment"
                      value="Yes"
                      checked={formData.medicalTreatment === "Yes"}
                      onChange={() => handleRadioChange('medicalTreatment', "Yes")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="medical-yes">{t('forms.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="medical-no"
                      name="medicalTreatment"
                      value="No"
                      checked={formData.medicalTreatment === "No"}
                      onChange={() => handleRadioChange('medicalTreatment', "No")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="medical-no">{t('forms.no')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="medical-refused"
                      name="medicalTreatment"
                      value="Refused"
                      checked={formData.medicalTreatment === "Refused"}
                      onChange={() => handleRadioChange('medicalTreatment', "Refused")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="medical-refused">{t('forms.refused')}</Label>
                  </div>
                </div>
              </div>

              {formData.medicalTreatment === "Yes" && (
                <div className="space-y-4">
                  <Label className="font-medium">{t('forms.whereMedicalTreatmentProvided')}</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="medical-onsite"
                        name="medicalTreatmentLocation"
                        value="On Site"
                        checked={formData.medicalTreatmentLocation === "On Site"}
                        onChange={() => handleRadioChange('medicalTreatmentLocation', "On Site")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="medical-onsite">{t('forms.onSite')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="medical-hospital"
                        name="medicalTreatmentLocation"
                        value="Hospital"
                        checked={formData.medicalTreatmentLocation === "Hospital"}
                        onChange={() => handleRadioChange('medicalTreatmentLocation', "Hospital")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="medical-hospital">{t('forms.hospital')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="medical-other"
                        name="medicalTreatmentLocation"
                        value="Other"
                        checked={formData.medicalTreatmentLocation === "Other"}
                        onChange={() => handleRadioChange('medicalTreatmentLocation', "Other")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="medical-other">{t('forms.other')}</Label>
                    </div>
                  </div>
                  
                  {formData.medicalTreatmentLocation === "Other" && (
                    <div className="space-y-2">
                      <Label htmlFor="medicalTreatmentDetails">{t('forms.provideDetails')}</Label>
                      <Input
                        id="medicalTreatmentDetails"
                        name="medicalTreatmentDetails"
                        value={formData.medicalTreatmentDetails || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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

              <div className="space-y-2">
                <Label>{t('forms.signature')}</Label>
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
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>{t('common.cancel')}</Button>
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