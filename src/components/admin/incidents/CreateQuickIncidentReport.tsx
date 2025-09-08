"use client";

import { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";
import { useCreateAdminIncidentMutation } from "@/lib/features/incidents/incidentsApi";
import { workersCompApi } from "@/lib/features/workers-comp/workersCompApi";
import { useDispatch } from 'react-redux';
import { ArrowLeft } from "lucide-react";
import SignatureModal from "@/components/SignatureModal";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SubcontractorSelect from "@/components/SubcontractorSelect";

interface CreateQuickIncidentReportProps {
  onBack: () => void;
}

interface QuickIncidentFormData {
  completedBy: string;
  reportDate: string;
  projectName: string;
  injuredPerson: string;
  companySubcontractor: string;
  reporterFullName: string;
  reporterDate: string;
  signature: string;
  adminReportReviewedBy: string;
  adminReviewDate: string;
  adminFollowUpAction: string;
  status: string;
}

export default function CreateQuickIncidentReport({ onBack }: CreateQuickIncidentReportProps) {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<QuickIncidentFormData>({
    completedBy: '',
    reportDate: new Date().toISOString().split('T')[0],
    projectName: '',
    injuredPerson: '',
    companySubcontractor: '',
    reporterFullName: '',
    reporterDate: new Date().toISOString().split('T')[0],
    signature: '',
    adminReportReviewedBy: '',
    adminReviewDate: new Date().toISOString().split('T')[0],
    adminFollowUpAction: '',
    status: 'reported'
  });

  const [createIncident, { isLoading }] = useCreateAdminIncidentMutation();
  const { toast, showToast, hideToast } = useToast();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSignatureChange = (signature: string) => {
    setFormData((prev) => ({
      ...prev,
      signature,
    }));
  };

  const handleCreate = useCallback(async () => {
    try {
      // Validate required fields
      if (!formData.completedBy || !formData.projectName || !formData.injuredPerson || !formData.reportDate || !formData.companySubcontractor) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      const result = await createIncident({
        reportedBy: formData.completedBy,
        injuredEmployee: formData.injuredPerson,
        projectName: formData.projectName,
        dateOfIncident: formData.reportDate,
        company: formData.companySubcontractor,
        incidentType: 'quick-incident-report',
        formData: formData
      }).unwrap();

      if (result.success) {
        // Manually refetch workers-comp data
        dispatch(workersCompApi.util.invalidateTags(['WorkersCompData']));
        showToast(t('common.incidentCreatedSuccessfully'), 'success');
        onBack(); // Navigate back to the list
      } else {
        showToast(result.error || t('common.failedToCreateIncident'), 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || t('common.failedToCreateIncident'), 'error');
    }
  }, [formData, createIncident, showToast, dispatch, onBack]);

  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{t('common.create')} {t('forms.quickIncidentReport')}</h2>
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
                label={`${t('forms.completedBy')} *`}
                value={formData.completedBy}
                onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                authType="admin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDate">{t('forms.reportDate')} *</Label>
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
                label={`${t('forms.projectName')} *`}
                value={formData.projectName}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                authType="admin"
                required
              />
            </div>
            <div className="space-y-2">
              <SubcontractorSelect
                id="companySubcontractor"
                name="companySubcontractor"
                label={`${t('forms.companySubcontractor')} *`}
                value={formData.companySubcontractor}
                onChange={(value) => setFormData(prev => ({ ...prev, companySubcontractor: value }))}
                authType="admin"
                returnValue="name"
                required
              />
            </div>
            <div className="space-y-2">
              <ContractorSelect
                id="injuredPerson"
                name="injuredPerson"
                label={`${t('forms.injuredPerson')} *`}
                value={formData.injuredPerson}
                onChange={(value) => setFormData(prev => ({ ...prev, injuredPerson: value }))}
                authType="admin"
                required
              />
            </div>
          </div>

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
                  />
                </div>
              </div>

              <SignatureModal
                signature={formData.signature}
                onSignatureChange={handleSignatureChange}
                signerName={formData.completedBy || 'Signature'}
                modalTitle={`${t('forms.quickIncidentReport')} - ${t('forms.digitalSignature')} (Admin Create)`}
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
                    value={formData.adminReportReviewedBy}
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
                    value={formData.adminReviewDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminFollowUpAction">{t('forms.followUpActionTaken')}</Label>
                <Textarea
                  id="adminFollowUpAction"
                  name="adminFollowUpAction"
                  value={formData.adminFollowUpAction}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('forms.status')}</Label>
                <Select
                  value={formData.status}
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
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? t('common.creating') : t('common.createReport')}
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