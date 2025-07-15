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
import { ArrowLeft, Plus, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";

interface ReviewerData {
  name: string;
  signature: string;
}

interface InvestigatorData {
  signature: string;
  title: string;
}

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
  const reviewerSignatureRefs = useRef<(SignatureCanvas | null)[]>([]);
  const investigatorSignatureRefs = useRef<(SignatureCanvas | null)[]>([]);

  // Load main signature into canvas when component mounts
  useEffect(() => {
    if (formData.signature && signatureRef.current) {
      const canvas = signatureRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = formData.signature;
      }
    }
  }, [formData.signature]);

  // Load reviewer signatures into canvases
  useEffect(() => {
    if (formData.reviewers) {
      formData.reviewers.forEach((reviewer: ReviewerData, index: number) => {
        if (reviewer.signature && reviewerSignatureRefs.current[index]) {
          const canvas = reviewerSignatureRefs.current[index]!.getCanvas();
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = reviewer.signature;
          }
        }
      });
    }
  }, [formData.reviewers]);

  // Load investigator signatures into canvases
  useEffect(() => {
    if (formData.investigators) {
      formData.investigators.forEach((investigator: InvestigatorData, index: number) => {
        if (investigator.signature && investigatorSignatureRefs.current[index]) {
          const canvas = investigatorSignatureRefs.current[index]!.getCanvas();
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = investigator.signature;
          }
        }
      });
    }
  }, [formData.investigators]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleCheckboxArrayChange = useCallback((arrayName: string, value: string, checked: boolean) => {
    setFormData((prev: any) => {
      const currentArray = prev[arrayName] || [];
      const newArray = checked 
        ? [...currentArray, value] 
        : currentArray.filter((item: string) => item !== value);
      
      return {
        ...prev,
        [arrayName]: newArray,
      };
    });
  }, []);

  const handleWitnessChange = useCallback((index: number, value: string) => {
    setFormData((prev: any) => {
      const newWitnesses = [...(prev.witnesses || [])];
      newWitnesses[index] = value;
      return {
        ...prev,
        witnesses: newWitnesses,
      };
    });
  }, []);

  const addWitness = useCallback(() => {
    setFormData((prev: any) => ({
      ...prev,
      witnesses: [...(prev.witnesses || []), ""],
    }));
  }, []);

  const removeWitness = useCallback((index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      witnesses: (prev.witnesses || []).filter((_: any, i: number) => i !== index),
    }));
  }, []);

  const handleReviewerChange = useCallback((index: number, field: keyof ReviewerData, value: string) => {
    setFormData((prev: any) => {
      const newReviewers = [...(prev.reviewers || [])];
      newReviewers[index] = { ...newReviewers[index], [field]: value };
      return {
        ...prev,
        reviewers: newReviewers,
      };
    });
  }, []);

  const addReviewer = useCallback(() => {
    setFormData((prev: any) => ({
      ...prev,
      reviewers: [...(prev.reviewers || []), { name: "", signature: "" }],
    }));
  }, []);

  const removeReviewer = useCallback((index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      reviewers: (prev.reviewers || []).filter((_: any, i: number) => i !== index),
    }));
  }, []);

  const handleInvestigatorChange = useCallback((index: number, field: keyof InvestigatorData, value: string) => {
    setFormData((prev: any) => {
      const newInvestigators = [...(prev.investigators || [])];
      newInvestigators[index] = { ...newInvestigators[index], [field]: value };
      return {
        ...prev,
        investigators: newInvestigators,
      };
    });
  }, []);

  const addInvestigator = useCallback(() => {
    setFormData((prev: any) => ({
      ...prev,
      investigators: [...(prev.investigators || []), { signature: "", title: "" }],
    }));
  }, []);

  const removeInvestigator = useCallback((index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      investigators: (prev.investigators || []).filter((_: any, i: number) => i !== index),
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
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev: any) => ({
        ...prev,
        signature: signatureData,
      }));
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

  const handleReviewerSignatureEnd = useCallback((index: number) => {
    const canvas = reviewerSignatureRefs.current[index];
    if (canvas) {
      const signatureData = canvas.toDataURL();
      handleReviewerChange(index, 'signature', signatureData);
    }
  }, [handleReviewerChange]);

  const handleReviewerSignatureClear = useCallback((index: number) => {
    const canvas = reviewerSignatureRefs.current[index];
    if (canvas) {
      canvas.clear();
      handleReviewerChange(index, 'signature', "");
    }
  }, [handleReviewerChange]);

  const handleInvestigatorSignatureEnd = useCallback((index: number) => {
    const canvas = investigatorSignatureRefs.current[index];
    if (canvas) {
      const signatureData = canvas.toDataURL();
      handleInvestigatorChange(index, 'signature', signatureData);
    }
  }, [handleInvestigatorChange]);

  const handleInvestigatorSignatureClear = useCallback((index: number) => {
    const canvas = investigatorSignatureRefs.current[index];
    if (canvas) {
      canvas.clear();
      handleInvestigatorChange(index, 'signature', "");
    }
  }, [handleInvestigatorChange]);

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
              <Label htmlFor="reportDate">{t('incidentReport.reportDate')}</Label>
              <Input
                id="reportDate"
                name="reportDate"
                type="date"
                value={formData.reportDate || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor">{t('formFields.supervisor')}</Label>
              <Input
                id="supervisor"
                name="supervisor"
                value={formData.supervisor || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">{t('formFields.projectName')}</Label>
              <Input
                id="projectName"
                name="projectName"
                value={formData.projectName || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySubcontractor">{t('incidentReport.companySubcontractor')}</Label>
              <Input
                id="companySubcontractor"
                name="companySubcontractor"
                value={formData.companySubcontractor || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="injuredParty">{t('incidentReport.injuredParty')}</Label>
              <Input
                id="injuredParty"
                name="injuredParty"
                value={formData.injuredParty || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Accident/Incident Category */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.accidentIncidentCategory')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('incidentReport.checkAllThatApply')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  'Injury', 'Illness', 'Near Miss', 'Property Damage', 'Fire', 'Chemical Exposure',
                  'On-site Equipment', 'Motor Vehicle', 'Electrical', 'Mechanical', 'Spill'
                ].map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={(formData.accidentCategory || []).includes(category)}
                      onChange={(e) =>
                        handleCheckboxArrayChange('accidentCategory', category, e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`category-${category}`}>{category}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="accidentCategoryOther">{t('formFields.other')}:</Label>
                <Input
                  id="accidentCategoryOther"
                  name="accidentCategoryOther"
                  value={formData.accidentCategoryOther || ''}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date and Time of Accident */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.dateTimeOfAccident')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="accidentDate">{t('incidentReport.accidentDate')}</Label>
                  <Input
                    id="accidentDate"
                    name="accidentDate"
                    type="date"
                    value={formData.accidentDate || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accidentTime">{t('incidentReport.accidentTime')}</Label>
                  <Input
                    id="accidentTime"
                    name="accidentTime"
                    type="time"
                    value={formData.accidentTime || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Narrative Report */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.narrativeReport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="narrativeReport">{t('incidentReport.narrativeReportDescription')}</Label>
                <Textarea
                  id="narrativeReport"
                  name="narrativeReport"
                  value={formData.narrativeReport || ''}
                  onChange={handleInputChange}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Witnesses */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.witnessToAccident')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.witnesses || []).map((witness: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={witness}
                    onChange={(e) => handleWitnessChange(index, e.target.value)}
                    placeholder={`Witness ${index + 1} name`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeWitness(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addWitness}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Witness
              </Button>
            </CardContent>
          </Card>

          {/* Injured/Ill Person Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.injuredIll')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="injuredName">{t('incidentReport.injuredName')}</Label>
                  <Input
                    id="injuredName"
                    name="injuredName"
                    value={formData.injuredName || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuredAddress">{t('incidentReport.address')}</Label>
                  <Input
                    id="injuredAddress"
                    name="injuredAddress"
                    value={formData.injuredAddress || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuredAge">{t('incidentReport.age')}</Label>
                  <Input
                    id="injuredAge"
                    name="injuredAge"
                    value={formData.injuredAge || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lengthOfService">{t('incidentReport.lengthOfService')}</Label>
                  <Input
                    id="lengthOfService"
                    name="lengthOfService"
                    value={formData.lengthOfService || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeOnPresentJob">{t('incidentReport.timeOnPresentJob')}</Label>
                  <Input
                    id="timeOnPresentJob"
                    name="timeOnPresentJob"
                    value={formData.timeOnPresentJob || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeClassification">{t('incidentReport.timeClassification')}</Label>
                  <Input
                    id="timeClassification"
                    name="timeClassification"
                    value={formData.timeClassification || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Severity of Injury */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.severityOfInjury')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  id="severityOfInjury"
                  name="severityOfInjury"
                  value={formData.severityOfInjury || ''}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Estimated Days Away */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.estimatedDaysAway')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  id="estimatedDaysAway"
                  name="estimatedDaysAway"
                  type="number"
                  value={formData.estimatedDaysAway || ''}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nature of Injury */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.natureOfInjury')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  id="natureOfInjury"
                  name="natureOfInjury"
                  value={formData.natureOfInjury || ''}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification of Injury */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.classificationOfInjury')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Fatality', 'Lost Time', 'Restricted Work', 'Medical Treatment', 'First Aid', 'Near Miss'
                ].map((classification) => (
                  <div key={classification} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`classification-${classification}`}
                      checked={(formData.injuryClassification || []).includes(classification)}
                      onChange={(e) =>
                        handleCheckboxArrayChange('injuryClassification', classification, e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`classification-${classification}`}>{classification}</Label>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="partOfBodyAffected">{t('incidentReport.partOfBodyAffected')}</Label>
                  <Input
                    id="partOfBodyAffected"
                    name="partOfBodyAffected"
                    value={formData.partOfBodyAffected || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="degreeOfDisability">{t('incidentReport.degreeOfDisability')}</Label>
                  <Input
                    id="degreeOfDisability"
                    name="degreeOfDisability"
                    value={formData.degreeOfDisability || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateMedicalCareReceived">{t('incidentReport.dateMedicalCareReceived')}</Label>
                  <Input
                    id="dateMedicalCareReceived"
                    name="dateMedicalCareReceived"
                    type="date"
                    value={formData.dateMedicalCareReceived || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whereMedicalCareReceived">{t('incidentReport.whereMedicalCareReceived')}</Label>
                  <Input
                    id="whereMedicalCareReceived"
                    name="whereMedicalCareReceived"
                    value={formData.whereMedicalCareReceived || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressIfOffSite">{t('incidentReport.addressIfOffSite')}</Label>
                  <Input
                    id="addressIfOffSite"
                    name="addressIfOffSite"
                    value={formData.addressIfOffSite || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Damage */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.propertyDamage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="damageDescription">{t('incidentReport.damageDescription')}</Label>
                  <Textarea
                    id="damageDescription"
                    name="damageDescription"
                    value={formData.damageDescription || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costOfDamage">{t('incidentReport.costOfDamage')}</Label>
                  <Input
                    id="costOfDamage"
                    name="costOfDamage"
                    type="number"
                    step="0.01"
                    value={formData.costOfDamage || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accident Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.accidentAnalysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="wasWeatherFactor">{t('incidentReport.wasWeatherFactor')}</Label>
                  <Input
                    id="wasWeatherFactor"
                    name="wasWeatherFactor"
                    value={formData.wasWeatherFactor || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unsafeConditions">{t('incidentReport.unsafeConditions')}</Label>
                  <Textarea
                    id="unsafeConditions"
                    name="unsafeConditions"
                    value={formData.unsafeConditions || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalFactors">{t('incidentReport.personalFactors')}</Label>
                  <Textarea
                    id="personalFactors"
                    name="personalFactors"
                    value={formData.personalFactors || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On-Site Accidents */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.onSiteAccidents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="levelOfPPERequired">{t('incidentReport.levelOfPPERequired')}</Label>
                  <Textarea
                    id="levelOfPPERequired"
                    name="levelOfPPERequired"
                    value={formData.levelOfPPERequired || ''}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modifications">{t('incidentReport.modifications')}</Label>
                  <Textarea
                    id="modifications"
                    name="modifications"
                    value={formData.modifications || ''}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wasInjuredUsingRequiredEquipment">{t('incidentReport.wasInjuredUsingRequiredEquipment')}</Label>
                  <Input
                    id="wasInjuredUsingRequiredEquipment"
                    name="wasInjuredUsingRequiredEquipment"
                    value={formData.wasInjuredUsingRequiredEquipment || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="howEquipmentUseDiffered">{t('incidentReport.howEquipmentUseDiffered')}</Label>
                  <Textarea
                    id="howEquipmentUseDiffered"
                    name="howEquipmentUseDiffered"
                    value={formData.howEquipmentUseDiffered || ''}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Taken */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.actionTakenToPreventRecurrence')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  id="actionTakenToPreventRecurrence"
                  name="actionTakenToPreventRecurrence"
                  value={formData.actionTakenToPreventRecurrence || ''}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Report Reviewed By */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.reportReviewedBy')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.reviewers || []).map((reviewer: ReviewerData, index: number) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Reviewer {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeReviewer(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`reviewer-name-${index}`}>{t('incidentReport.reviewerName')}</Label>
                      <Input
                        id={`reviewer-name-${index}`}
                        value={reviewer.name}
                        onChange={(e) => handleReviewerChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('incidentReport.reviewerSignature')}</Label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                        <SignatureCanvas
                          ref={(ref) => {
                            reviewerSignatureRefs.current[index] = ref;
                          }}
                          canvasProps={{
                            width: 400,
                            height: 200,
                            className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
                          }}
                          onEnd={() => handleReviewerSignatureEnd(index)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewerSignatureClear(index)}
                        className="text-sm"
                      >
                        {t('forms.clearSignature')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReviewer}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('incidentReport.addReviewer')}
              </Button>
            </CardContent>
          </Card>

          {/* Others Participating */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidentReport.othersParticipating')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.investigators || []).map((investigator: InvestigatorData, index: number) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Investigator {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeInvestigator(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`investigator-title-${index}`}>{t('incidentReport.investigatorTitle')}</Label>
                      <Input
                        id={`investigator-title-${index}`}
                        value={investigator.title}
                        onChange={(e) => handleInvestigatorChange(index, 'title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('incidentReport.investigatorSignature')}</Label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                        <SignatureCanvas
                          ref={(ref) => {
                            investigatorSignatureRefs.current[index] = ref;
                          }}
                          canvasProps={{
                            width: 400,
                            height: 200,
                            className: "signature-canvas w-full max-w-md mx-auto border rounded bg-white"
                          }}
                          onEnd={() => handleInvestigatorSignatureEnd(index)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvestigatorSignatureClear(index)}
                        className="text-sm"
                      >
                        {t('forms.clearSignature')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvestigator}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('incidentReport.addInvestigator')}
              </Button>
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

          {/* Signature */}
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