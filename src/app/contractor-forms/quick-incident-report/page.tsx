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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";

interface QuickIncidentReportFormData {
  completedBy: string;
  reportDate: string;
  projectName: string;
  injuredPerson: string;
  signature: string;
  reporterFullName: string;
  reporterDate: string;
  photos: File[];
}

export default function QuickIncidentReportPage() {
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const router = useRouter();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<QuickIncidentReportFormData>({
    completedBy: contractor?.name || "",
    reportDate: new Date().toISOString().split("T")[0],
    projectName: "",
    injuredPerson: "",
    signature: "",
    reporterFullName: contractor?.name || "",
    reporterDate: new Date().toISOString().split("T")[0],
    photos: [],
  });

  const resetFormData = useCallback(() => {
    setFormData({
      completedBy: contractor?.name || "",
      reportDate: new Date().toISOString().split("T")[0],
      projectName: "",
      injuredPerson: "",
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
      submissionType: 'quick-incident-report',
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
            <h1 className="text-3xl font-bold text-foreground">{t('forms.quickIncidentReport')}</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">{t('forms.quickReportDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Quick Incident Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <ContractorSelect
                      id="injuredPerson"
                      name="injuredPerson"
                      label={t('forms.injuredPerson')}
                      value={formData.injuredPerson}
                      onChange={(value) => setFormData(prev => ({ ...prev, injuredPerson: value }))}
                      required
                    />
                  </div>
                </div>

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
                    {t('forms.quickIncidentReport')} {t('forms.submitSuccess')}
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