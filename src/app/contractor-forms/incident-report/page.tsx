"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useSubmitFormMutation } from "@/lib/features/submissions/submissionsApi";
import { useAppSelector } from "@/lib/hooks";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
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

interface IncidentReportFormData {
  completedBy: string;
  reportDate: string;
  supervisor: string;
  projectName: string;
  companySubcontractor: string;
  injuredParty: string;
  signature: string;
  
  // 1. Accident/Incident Category
  accidentCategory: string[];
  accidentCategoryOther: string;
  
  // 2. Date and Time
  accidentDate: string;
  accidentTime: string;
  
  // Narrative Report
  narrativeReport: string;
  
  // 3. Witnesses
  witnesses: string[];
  
  // 4. Injured/Ill Person Details
  injuredName: string;
  injuredAddress: string;
  injuredAge: string;
  lengthOfService: string;
  timeOnPresentJob: string;
  timeClassification: string;
  
  // 5. Severity
  severityOfInjury: string;
  
  // 6. Days away from job
  estimatedDaysAway: string;
  
  // 7. Nature of injury
  natureOfInjury: string;
  
  // 8. Classification of injury
  injuryClassification: string[];
  partOfBodyAffected: string;
  degreeOfDisability: string;
  dateMedicalCareReceived: string;
  whereMedicalCareReceived: string;
  addressIfOffSite: string;
  
  // 9. Property Damage
  damageDescription: string;
  costOfDamage: string;
  
  // 10. Accident Analysis
  wasWeatherFactor: string;
  unsafeConditions: string;
  personalFactors: string;
  
  // 11. On-site accidents
  levelOfPPERequired: string;
  modifications: string;
  wasInjuredUsingRequiredEquipment: string;
  howEquipmentUseDiffered: string;
  
  // 12. Action taken
  actionTakenToPreventRecurrence: string;
  
  // 13. Report reviewed by (dynamic array)
  reviewers: ReviewerData[];
  
  // 14. Others participating (dynamic array)
  investigators: InvestigatorData[];
  
  photos: File[];
}

export default function IncidentReportPage() {
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const signatureRef = useRef<SignatureCanvas>(null);
  const reviewerSignatureRefs = useRef<(SignatureCanvas | null)[]>([]);
  const investigatorSignatureRefs = useRef<(SignatureCanvas | null)[]>([]);
  
  const [formData, setFormData] = useState<IncidentReportFormData>({
    completedBy: contractor?.name || "",
    reportDate: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
    companySubcontractor: contractor?.companyName || "",
    injuredParty: "",
    signature: "",
    
    accidentCategory: [],
    accidentCategoryOther: "",
    accidentDate: "",
    accidentTime: "",
    narrativeReport: "",
    witnesses: [],
    
    injuredName: "",
    injuredAddress: "",
    injuredAge: "",
    lengthOfService: "",
    timeOnPresentJob: "",
    timeClassification: "",
    
    severityOfInjury: "",
    estimatedDaysAway: "",
    natureOfInjury: "",
    
    injuryClassification: [],
    partOfBodyAffected: "",
    degreeOfDisability: "",
    dateMedicalCareReceived: "",
    whereMedicalCareReceived: "",
    addressIfOffSite: "",
    
    damageDescription: "",
    costOfDamage: "",
    
    wasWeatherFactor: "",
    unsafeConditions: "",
    personalFactors: "",
    
    levelOfPPERequired: "",
    modifications: "",
    wasInjuredUsingRequiredEquipment: "",
    howEquipmentUseDiffered: "",
    
    actionTakenToPreventRecurrence: "",
    
    reviewers: [{ name: "", signature: "" }],
    investigators: [{ signature: "", title: "" }],
    
    photos: [],
  });

  const resetFormData = useCallback(() => {
    setFormData({
      completedBy: contractor?.name || "",
      reportDate: new Date().toISOString().split("T")[0],
      supervisor: "",
      projectName: "",
      companySubcontractor: contractor?.companyName || "",
      injuredParty: "",
      signature: "",
      
      accidentCategory: [],
      accidentCategoryOther: "",
      accidentDate: "",
      accidentTime: "",
      narrativeReport: "",
      witnesses: [],
      
      injuredName: "",
      injuredAddress: "",
      injuredAge: "",
      lengthOfService: "",
      timeOnPresentJob: "",
      timeClassification: "",
      
      severityOfInjury: "",
      estimatedDaysAway: "",
      natureOfInjury: "",
      
      injuryClassification: [],
      partOfBodyAffected: "",
      degreeOfDisability: "",
      dateMedicalCareReceived: "",
      whereMedicalCareReceived: "",
      addressIfOffSite: "",
      
      damageDescription: "",
      costOfDamage: "",
      
      wasWeatherFactor: "",
      unsafeConditions: "",
      personalFactors: "",
      
      levelOfPPERequired: "",
      modifications: "",
      wasInjuredUsingRequiredEquipment: "",
      howEquipmentUseDiffered: "",
      
      actionTakenToPreventRecurrence: "",
      
      reviewers: [{ name: "", signature: "" }],
      investigators: [{ signature: "", title: "" }],
      
      photos: [],
    });
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    reviewerSignatureRefs.current.forEach(ref => ref?.clear());
    investigatorSignatureRefs.current.forEach(ref => ref?.clear());
  }, [contractor]);

  useEffect(() => {
    if (isSuccess) {
      resetFormData();
    }
  }, [isSuccess, resetFormData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleCheckboxArrayChange = useCallback((fieldName: string, value: string, checked: boolean) => {
    setFormData((prev) => {
      const currentArray = prev[fieldName as keyof IncidentReportFormData] as string[];
      const newArray = checked 
        ? [...currentArray, value] 
        : currentArray.filter((item) => item !== value);
      
      return {
        ...prev,
        [fieldName]: newArray,
      };
    });
  }, []);

  const handleRadioChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }));
  }, []);

  const handleDeletePhoto = useCallback((indexToDelete: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToDelete),
    }));
  }, []);

  const handleSignatureClear = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev) => ({
        ...prev,
        signature: "",
      }));
    }
  }, []);

  const handleSignatureEnd = useCallback(() => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  }, []);

  // Reviewer functions
  const addReviewer = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      reviewers: [...prev.reviewers, { name: "", signature: "" }]
    }));
  }, []);

  const removeReviewer = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      reviewers: prev.reviewers.filter((_, i) => i !== index)
    }));
    reviewerSignatureRefs.current = reviewerSignatureRefs.current.filter((_, i) => i !== index);
  }, []);

  const handleReviewerChange = useCallback((index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      reviewers: prev.reviewers.map((reviewer, i) => 
        i === index ? { ...reviewer, [field]: value } : reviewer
      )
    }));
  }, []);

  // Investigator functions
  const addInvestigator = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      investigators: [...prev.investigators, { signature: "", title: "" }]
    }));
  }, []);

  const removeInvestigator = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      investigators: prev.investigators.filter((_, i) => i !== index)
    }));
    investigatorSignatureRefs.current = investigatorSignatureRefs.current.filter((_, i) => i !== index);
  }, []);

  const handleInvestigatorChange = useCallback((index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      investigators: prev.investigators.map((investigator, i) => 
        i === index ? { ...investigator, [field]: value } : investigator
      )
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    await submitForm({
      submissionType: 'incident-report',
      projectName: formData.projectName,
      date: formData.reportDate,
      formData: formData,
      files: formData.photos,
      authType: 'contractor',
    });
  }, [formData, submitForm, reset]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/contractor-forms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('forms.backToForms')}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{t('forms.incidentReport')}</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">{t('forms.reportDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <ContractorSelect
                      id="completedBy"
                      name="completedBy"
                      value={formData.completedBy}
                      onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportDate">{t('incidentReport.reportDate')}</Label>
                    <Input
                      id="reportDate"
                      name="reportDate"
                      type="date"
                      value={formData.reportDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor">{t('formFields.supervisor')}</Label>
                    <Input
                      id="supervisor"
                      name="supervisor"
                      value={formData.supervisor}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectName">{t('formFields.projectName')}</Label>
                    <Input 
                      id="projectName" 
                      name="projectName" 
                      value={formData.projectName} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySubcontractor">{t('incidentReport.companySubcontractor')}</Label>
                    <Input
                      id="companySubcontractor"
                      name="companySubcontractor"
                      value={formData.companySubcontractor}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="injuredParty">{t('incidentReport.injuredParty')}</Label>
                    <Input
                      id="injuredParty"
                      name="injuredParty"
                      value={formData.injuredParty}
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
                            checked={formData.accidentCategory.includes(category)}
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
                        value={formData.accidentCategoryOther}
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
                          value={formData.accidentDate}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accidentTime">{t('incidentReport.accidentTime')}</Label>
                        <Input
                          id="accidentTime"
                          name="accidentTime"
                          type="time"
                          value={formData.accidentTime}
                          onChange={handleInputChange}
                          required
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
                        value={formData.narrativeReport}
                        onChange={handleInputChange}
                        rows={6}
                        required
                      />
                    </div>
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
                          value={formData.injuredName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="injuredAddress">{t('incidentReport.address')}</Label>
                        <Input
                          id="injuredAddress"
                          name="injuredAddress"
                          value={formData.injuredAddress}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="injuredAge">{t('incidentReport.age')}</Label>
                        <Input
                          id="injuredAge"
                          name="injuredAge"
                          value={formData.injuredAge}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lengthOfService">{t('incidentReport.lengthOfService')}</Label>
                        <Input
                          id="lengthOfService"
                          name="lengthOfService"
                          value={formData.lengthOfService}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeOnPresentJob">{t('incidentReport.timeOnPresentJob')}</Label>
                        <Input
                          id="timeOnPresentJob"
                          name="timeOnPresentJob"
                          value={formData.timeOnPresentJob}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeClassification">{t('incidentReport.timeClassification')}</Label>
                        <Input
                          id="timeClassification"
                          name="timeClassification"
                          value={formData.timeClassification}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['Disabling', 'Non-disabling', 'Fatality', 'Medical Treatment', 'First Aid Only'].map((severity) => (
                        <div key={severity} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`severity-${severity}`}
                            name="severityOfInjury"
                            value={severity}
                            checked={formData.severityOfInjury === severity}
                            onChange={() => handleRadioChange('severityOfInjury', severity)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor={`severity-${severity}`}>{severity}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Days Away */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('incidentReport.estimatedDaysAway')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Input
                        id="estimatedDaysAway"
                        name="estimatedDaysAway"
                        value={formData.estimatedDaysAway}
                        onChange={handleInputChange}
                        placeholder="Number of days"
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
                        value={formData.natureOfInjury}
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
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        'Abrasions', 'Dislocations', 'Punctures', 'Bites', 'Faint/Dizziness', 'Radiation Burns',
                        'Blisters', 'Fractures', 'Respiratory', 'Allergy', 'Bruises', 'Frostbite',
                        'Sprains', 'Chemical Burns', 'Heat Burns', 'Toxic Resp. Exposure', 'Cold Exposure',
                        'Heat Exhaustion', 'Toxic Ingestion', 'Concussion', 'Heat Stroke', 'Dermal Allergy', 'Lacerations'
                      ].map((classification) => (
                        <div key={classification} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`classification-${classification}`}
                            checked={formData.injuryClassification.includes(classification)}
                            onChange={(e) =>
                              handleCheckboxArrayChange('injuryClassification', classification, e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor={`classification-${classification}`} className="text-sm">{classification}</Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="partOfBodyAffected">{t('incidentReport.partOfBodyAffected')}</Label>
                        <Input
                          id="partOfBodyAffected"
                          name="partOfBodyAffected"
                          value={formData.partOfBodyAffected}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="degreeOfDisability">{t('incidentReport.degreeOfDisability')}</Label>
                        <Input
                          id="degreeOfDisability"
                          name="degreeOfDisability"
                          value={formData.degreeOfDisability}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateMedicalCareReceived">{t('incidentReport.dateMedicalCareReceived')}</Label>
                        <Input
                          id="dateMedicalCareReceived"
                          name="dateMedicalCareReceived"
                          type="date"
                          value={formData.dateMedicalCareReceived}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whereMedicalCareReceived">{t('incidentReport.whereMedicalCareReceived')}</Label>
                        <Input
                          id="whereMedicalCareReceived"
                          name="whereMedicalCareReceived"
                          value={formData.whereMedicalCareReceived}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="addressIfOffSite">{t('incidentReport.addressIfOffSite')}</Label>
                        <Input
                          id="addressIfOffSite"
                          name="addressIfOffSite"
                          value={formData.addressIfOffSite}
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
                          value={formData.damageDescription}
                          onChange={handleInputChange}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="costOfDamage">{t('incidentReport.costOfDamage')}</Label>
                        <Input
                          id="costOfDamage"
                          name="costOfDamage"
                          value={formData.costOfDamage}
                          onChange={handleInputChange}
                          placeholder="$0.00"
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
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label className="font-medium">{t('incidentReport.wasWeatherFactor')}</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="weather-yes"
                            name="wasWeatherFactor"
                            value="Yes"
                            checked={formData.wasWeatherFactor === "Yes"}
                            onChange={() => handleRadioChange('wasWeatherFactor', "Yes")}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="weather-yes">{t('adminEdit.yes')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="weather-no"
                            name="wasWeatherFactor"
                            value="No"
                            checked={formData.wasWeatherFactor === "No"}
                            onChange={() => handleRadioChange('wasWeatherFactor', "No")}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="weather-no">{t('adminEdit.no')}</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="unsafeConditions">{t('incidentReport.unsafeConditions')}</Label>
                      <Textarea
                        id="unsafeConditions"
                        name="unsafeConditions"
                        value={formData.unsafeConditions}
                        onChange={handleInputChange}
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="personalFactors">{t('incidentReport.personalFactors')}</Label>
                      <Textarea
                        id="personalFactors"
                        name="personalFactors"
                        value={formData.personalFactors}
                        onChange={handleInputChange}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* On-site Accidents */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('incidentReport.onSiteAccidents')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="levelOfPPERequired">{t('incidentReport.levelOfPPERequired')}</Label>
                      <Textarea
                        id="levelOfPPERequired"
                        name="levelOfPPERequired"
                        value={formData.levelOfPPERequired}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="modifications">{t('incidentReport.modifications')}</Label>
                      <Textarea
                        id="modifications"
                        name="modifications"
                        value={formData.modifications}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="font-medium">{t('incidentReport.wasInjuredUsingRequiredEquipment')}</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="equipment-yes"
                            name="wasInjuredUsingRequiredEquipment"
                            value="Yes"
                            checked={formData.wasInjuredUsingRequiredEquipment === "Yes"}
                            onChange={() => handleRadioChange('wasInjuredUsingRequiredEquipment', "Yes")}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="equipment-yes">{t('adminEdit.yes')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="equipment-no"
                            name="wasInjuredUsingRequiredEquipment"
                            value="No"
                            checked={formData.wasInjuredUsingRequiredEquipment === "No"}
                            onChange={() => handleRadioChange('wasInjuredUsingRequiredEquipment', "No")}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="equipment-no">{t('adminEdit.no')}</Label>
                        </div>
                      </div>
                    </div>
                    
                    {formData.wasInjuredUsingRequiredEquipment === "No" && (
                      <div className="space-y-2">
                        <Label htmlFor="howEquipmentUseDiffered">{t('incidentReport.howEquipmentUseDiffered')}</Label>
                        <Textarea
                          id="howEquipmentUseDiffered"
                          name="howEquipmentUseDiffered"
                          value={formData.howEquipmentUseDiffered}
                          onChange={handleInputChange}
                          rows={3}
                        />
                      </div>
                    )}
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
                        value={formData.actionTakenToPreventRecurrence}
                        onChange={handleInputChange}
                        rows={6}
                        required
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
                    {formData.reviewers.map((reviewer, index) => (
                      <div key={index} className="border p-4 rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Reviewer {index + 1}</h4>
                          {formData.reviewers.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeReviewer(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
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
                          <div className="border border-gray-300 rounded-lg p-2 bg-white">
                            <SignatureCanvas
                              ref={(ref) => { reviewerSignatureRefs.current[index] = ref; }}
                              canvasProps={{
                                width: 400,
                                height: 150,
                                className: "signature-canvas w-full max-w-md mx-auto border rounded"
                              }}
                              onEnd={() => {
                                if (reviewerSignatureRefs.current[index]) {
                                  const signatureData = reviewerSignatureRefs.current[index]!.toDataURL();
                                  handleReviewerChange(index, 'signature', signatureData);
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              reviewerSignatureRefs.current[index]?.clear();
                              handleReviewerChange(index, 'signature', '');
                            }}
                          >
                            {t('forms.clearSignature')}
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addReviewer}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('incidentReport.addReviewer')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Others Participating in Investigation */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('incidentReport.othersParticipating')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.investigators.map((investigator, index) => (
                      <div key={index} className="border p-4 rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Investigator {index + 1}</h4>
                          {formData.investigators.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeInvestigator(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
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
                          <div className="border border-gray-300 rounded-lg p-2 bg-white">
                            <SignatureCanvas
                              ref={(ref) => { investigatorSignatureRefs.current[index] = ref; }}
                              canvasProps={{
                                width: 400,
                                height: 150,
                                className: "signature-canvas w-full max-w-md mx-auto border rounded"
                              }}
                              onEnd={() => {
                                if (investigatorSignatureRefs.current[index]) {
                                  const signatureData = investigatorSignatureRefs.current[index]!.toDataURL();
                                  handleInvestigatorChange(index, 'signature', signatureData);
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              investigatorSignatureRefs.current[index]?.clear();
                              handleInvestigatorChange(index, 'signature', '');
                            }}
                          >
                            {t('forms.clearSignature')}
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addInvestigator}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('incidentReport.addInvestigator')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Photo Attachments */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('forms.attachments')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label htmlFor="photos">{t('safetyQuestions.addPhotos')}:</Label>
                      <input
                        type="file"
                        id="photos"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.photos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">{t('adminEdit.attachedFiles')}:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                            {formData.photos.map((file, index) => (
                              <AttachmentPreview
                                key={index}
                                file={file}
                                onDelete={() => handleDeletePhoto(index)}
                                showDeleteButton={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Main Signature Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('forms.digitalSignature')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('safetyQuestions.signaturePrompt')}:</Label>
                      <div className="border border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{
                            width: 400,
                            height: 200,
                            className: "signature-canvas w-full max-w-md mx-auto border rounded"
                          }}
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
                      {!formData.signature && (
                        <p className="text-sm text-red-600">{t('safetyQuestions.signatureRequired')}.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    {t('forms.incidentReport')} {t('forms.submitSuccess')}
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : t('forms.submitFailed')}
                  </div>
                )}

                <Button type="submit" disabled={isLoading || !formData.signature} className="w-full rounded-none">
                  {isLoading ? t('forms.submitting') : t('common.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}