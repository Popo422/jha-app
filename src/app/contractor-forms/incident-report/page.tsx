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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SubcontractorSelect from "@/components/SubcontractorSelect";
import SupervisorSelect from "@/components/SupervisorSelect";

interface IncidentReportFormData {
  // Basic Information
  completedBy: string;
  reportDate: string;
  supervisor: string;
  projectName: string;
  companySubcontractor: string;
  injuredParty: string;
  
  // Person Involved
  fullName: string;
  address: string;
  identification: string;
  identificationDetails: string;
  phone: string;
  email: string;
  
  // The Incident
  incidentDate: string;
  incidentTime: string;
  location: string;
  describeIncident: string;
  
  // Injuries
  anyoneInjured: string;
  injuryDescription: string;
  
  // Witnesses
  witnessesPresent: string;
  witnessDetails: string;
  
  // Police / Medical Services
  policeNotified: string;
  reportFiled: string;
  medicalTreatment: string;
  medicalTreatmentLocation: string;
  medicalTreatmentDetails: string;
  
  // Person Filing Report
  signature: string;
  reporterFullName: string;
  reporterDate: string;
  
  photos: File[];
}

export default function IncidentReportPage() {
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const router = useRouter();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<IncidentReportFormData>({
    completedBy: contractor?.name || "",
    reportDate: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
    companySubcontractor: contractor?.companyName || "",
    injuredParty: "",
    
    fullName: "",
    address: "",
    identification: "",
    identificationDetails: "",
    phone: "",
    email: "",
    
    incidentDate: "",
    incidentTime: "",
    location: "",
    describeIncident: "",
    
    anyoneInjured: "",
    injuryDescription: "",
    
    witnessesPresent: "",
    witnessDetails: "",
    
    policeNotified: "",
    reportFiled: "",
    medicalTreatment: "",
    medicalTreatmentLocation: "",
    medicalTreatmentDetails: "",
    
    signature: "",
    reporterFullName: contractor?.name || "",
    reporterDate: new Date().toISOString().split("T")[0],
    
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
      
      fullName: "",
      address: "",
      identification: "",
      identificationDetails: "",
      phone: "",
      email: "",
      
      incidentDate: "",
      incidentTime: "",
      location: "",
      describeIncident: "",
      
      anyoneInjured: "",
      injuryDescription: "",
      
      witnessesPresent: "",
      witnessDetails: "",
      
      policeNotified: "",
      reportFiled: "",
      medicalTreatment: "",
      medicalTreatmentLocation: "",
      medicalTreatmentDetails: "",
      
      signature: "",
      reporterFullName: contractor?.name || "",
      reporterDate: new Date().toISOString().split("T")[0],
      
      photos: [],
    });
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  }, [contractor]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        router.push('/contractor-forms');
      }, 1500);
      resetFormData();
    }
  }, [isSuccess, resetFormData, router]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
        <div className="max-w-4xl mx-auto">
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
                      label={t('forms.completedBy')}
                      value={formData.completedBy}
                      onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportDate">{t('forms.reportDate')}</Label>
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
                    <SupervisorSelect
                      id="supervisor"
                      name="supervisor"
                      label={t('forms.supervisor')}
                      value={formData.supervisor}
                      onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ProjectSelect
                      id="projectName"
                      name="projectName"
                      label={t('forms.projectName')}
                      value={formData.projectName}
                      onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <SubcontractorSelect
                      id="companySubcontractor"
                      name="companySubcontractor"
                      label={t('forms.companySubcontractor')}
                      value={formData.companySubcontractor}
                      onChange={(value) => setFormData(prev => ({ ...prev, companySubcontractor: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ContractorSelect
                      id="injuredParty"
                      name="injuredParty"
                      label={t('forms.injuredParty')}
                      value={formData.injuredParty}
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
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('forms.phone')}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">{t('forms.address')}</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('forms.email')}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="identification">{t('forms.identification')}</Label>
                      <select
                        id="identification"
                        name="identification"
                        value={formData.identification}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
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
                            value={formData.identificationDetails}
                            onChange={handleInputChange}
                            required
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
                          value={formData.incidentDate}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">{t('forms.location')}</Label>
                      <Textarea
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="describeIncident">{t('forms.describeIncident')}</Label>
                      <Textarea
                        id="describeIncident"
                        name="describeIncident"
                        value={formData.describeIncident}
                        onChange={handleInputChange}
                        rows={5}
                        required
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
                          value={formData.injuryDescription}
                          onChange={handleInputChange}
                          rows={4}
                          required
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
                          value={formData.witnessDetails}
                          onChange={handleInputChange}
                          rows={4}
                          required
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
                              value={formData.medicalTreatmentDetails}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Photo Attachments */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('forms.attachments')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label htmlFor="photos">{t('forms.addPhotos')}:</Label>
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
                          <p className="text-sm text-gray-600">{t('forms.attachedFiles')}:</p>
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
                          value={formData.reporterFullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reporterDate">{t('forms.date')}</Label>
                        <Input
                          id="reporterDate"
                          name="reporterDate"
                          type="date"
                          value={formData.reporterDate}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('forms.signature')}</Label>
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
                        <p className="text-sm text-red-600">{t('forms.signatureRequired')}</p>
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

                <Button type="submit" disabled={isLoading || !formData.signature} className="w-full">
                  {isLoading ? t('forms.submitting') : t('forms.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}