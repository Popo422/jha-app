"use client";

import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";

interface EndOfDayReportFormData {
  completedBy: string;
  date: string;
  supervisor: string;
  projectName: string;
  company: string;
  timeClocked: string;
  freeFromInjury: boolean | null;
  completedJHA: boolean | null;
  freeFromFever: boolean | null;
  freeFromCovidSymptoms: boolean | null;
  freeFromDirectExposure: boolean | null;
  traveledOutOfCountry: boolean | null;
  physicalDistancing: boolean | null;
  attachments: File[];
  signature: string;
}

export default function EndOfDayReportPage() {
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState<EndOfDayReportFormData>({
    completedBy: contractor?.name || "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
    company: contractor?.companyName || "",
    timeClocked: "",
    freeFromInjury: null,
    completedJHA: null,
    freeFromFever: null,
    freeFromCovidSymptoms: null,
    freeFromDirectExposure: null,
    traveledOutOfCountry: null,
    physicalDistancing: null,
    attachments: [],
    signature: "",
  });

  const signatureRef = useRef<SignatureCanvas>(null);

  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "radio") {
      const booleanValue = value === "true" ? true : value === "false" ? false : null;
      setFormData((prev) => ({
        ...prev,
        [name]: booleanValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const handleDeleteFile = (indexToDelete: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToDelete),
    }));
  };

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  };

  // Reset form on successful submission
  useEffect(() => {
    if (isSuccess) {
      setFormData({
        completedBy: contractor?.name || "",
        date: new Date().toISOString().split("T")[0],
        supervisor: "",
        projectName: "",
        company: contractor?.companyName || "",
        timeClocked: "",
        freeFromInjury: null,
        completedJHA: null,
        freeFromFever: null,
        freeFromCovidSymptoms: null,
        freeFromDirectExposure: null,
        traveledOutOfCountry: null,
        physicalDistancing: null,
        attachments: [],
        signature: "",
      });
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    }
  }, [isSuccess, contractor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); // Reset mutation state

    // Convert time to full datetime for supervisor clock out
    const clockOutDateTime = formData.timeClocked ? 
      new Date(`${formData.date}T${formData.timeClocked}`).toISOString() : undefined;

    await submitForm({
      submissionType: 'end-of-day',
      projectName: formData.projectName,
      date: formData.date,
      dateTimeClocked: clockOutDateTime,
      formData: {
        completedBy: formData.completedBy,
        date: formData.date,
        supervisor: formData.supervisor,
        company: formData.company,
        projectName: formData.projectName,
        timeClocked: formData.timeClocked,
        freeFromInjury: formData.freeFromInjury,
        completedJHA: formData.completedJHA,
        freeFromFever: formData.freeFromFever,
        freeFromCovidSymptoms: formData.freeFromCovidSymptoms,
        freeFromDirectExposure: formData.freeFromDirectExposure,
        traveledOutOfCountry: formData.traveledOutOfCountry,
        physicalDistancing: formData.physicalDistancing,
        signature: formData.signature,
      },
      files: formData.attachments,
      authType: 'contractor',
    });
  };

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
            <h1 className="text-3xl font-bold text-foreground">{t('forms.endOfDayReport')}</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">{t('forms.reportDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="date">{t('formFields.date')}</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      className="w-fit"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor">{t('formFields.supervisor')}</Label>
                    <Input
                      id="supervisor"
                      name="supervisor"
                      className="w-full"
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
                      placeholder={t('placeholders.projectName')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{t('formFields.company')}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeClocked">{t('adminEdit.timeClockedOut')}</Label>
                    <Input
                      id="timeClocked"
                      name="timeClocked"
                      type="time"
                      className="w-fit"
                      value={formData.timeClocked}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>{t('forms.instructions')}</strong> {`Any injuries or COVID-19 related symptoms must be reported to your supervisor immediately. Please Answer "${t('adminEdit.yes')}" or "${t('adminEdit.no')}"`}
                  </p>
                </div>

                {/* Health Check Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">
                      {t('adminEdit.endOfDayHealthSafetyCheck')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Free from injury */}
                    <div className="space-y-2">
                      <Label className="font-medium">
                        {t('adminEdit.leavingJobSiteFreeFromInjuries')}
                      </Label>
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
                      <Label className="font-medium">
                        {t('adminEdit.completedJHAToday')}
                      </Label>
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
                      <Label className="font-medium">
                        {t('adminEdit.freeFromFeverReporting')}
                      </Label>
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

                {/* File Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">{t('adminEdit.fileAttachments')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="attachments">{t('adminEdit.attachedFiles')}:</Label>
                      <input
                        type="file"
                        id="attachments"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.attachments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">{t('adminEdit.attachedFiles')}:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                            {formData.attachments.map((file, index) => (
                              <AttachmentPreview
                                key={index}
                                file={file}
                                onDelete={() => handleDeleteFile(index)}
                                showDeleteButton={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Signature Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">{t('forms.digitalSignature')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('adminEdit.employeeSignature')}:</Label>
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
                        <p className="text-sm text-red-600">{t('adminEdit.employeeSignature')} is required.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    {t('forms.endOfDayReport')} {t('forms.submitSuccess')}
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
