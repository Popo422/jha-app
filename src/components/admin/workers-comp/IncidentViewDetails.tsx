"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { useUpdateIncidentMutation, useGetIncidentByIdQuery, Incident } from "@/lib/features/incidents/incidentsApi";
import { Toast, useToast } from "@/components/ui/toast";
import ComplianceCountdown from "./ComplianceCountdown";

interface IncidentViewDetailsProps {
  incident: Incident;
  onBack: () => void;
  onEditIncident?: (incident: Incident) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  deadline: string;
  link?: string;
}

export default function IncidentViewDetails({ incident, onBack, onEditIncident }: IncidentViewDetailsProps) {
  const { t } = useTranslation();
  const [updateIncident, { isLoading: isSaving }] = useUpdateIncidentMutation();
  const { toast, showToast, hideToast } = useToast();
  
  // Fetch full incident details to ensure we have complete formData
  const { data: fullIncidentData, isLoading: isLoadingDetails } = useGetIncidentByIdQuery({ 
    id: incident.id, 
    authType: 'admin' 
  });
  const fullIncident = fullIncidentData?.incident || incident;
  
  const [reviewedBy, setReviewedBy] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "medical", label: t('workersComp.incidentDetails.checklist.provideMedicalCare'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.immediately') },
    { id: "supervisor", label: t('workersComp.incidentDetails.checklist.supervisorDocuments'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.immediately') },
    { id: "employee", label: t('workersComp.incidentDetails.checklist.employeeReports'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.within45Days') },
    { id: "froi", label: t('workersComp.incidentDetails.checklist.fileFROI'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.asapWithin30Days') },
    { id: "osha", label: t('workersComp.incidentDetails.checklist.reportOSHA'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.within8to24Hours') },
    { id: "records", label: t('workersComp.incidentDetails.checklist.maintainRecords'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.upTo5Years') },
    { id: "claims", label: t('workersComp.incidentDetails.checklist.supportClaims'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.ongoing') },
    { id: "safety", label: t('workersComp.incidentDetails.checklist.conductSafetyReview'), completed: false, deadline: t('workersComp.incidentDetails.checklist.deadlines.within1Week') },
  ]);


  // Initialize form with incident data
  useEffect(() => {
    setActionTaken(fullIncident.immediateAction || "");
    setReviewedBy(fullIncident.formData?.reviewedBy || "");
    
    // Load existing checklist data if available
    if (fullIncident.formData?.complianceChecklist) {
      const savedChecklist = fullIncident.formData.complianceChecklist;
      setChecklist(prev => prev.map(item => ({
        ...item,
        completed: savedChecklist.find((saved: any) => saved.id === item.id)?.completed || false
      })));
    }
  }, [fullIncident]);


  const handleChecklistChange = useCallback((itemId: string, completed: boolean) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed } : item
    ));
  }, []);

  const handleSeeForm = useCallback(() => {
    if (onEditIncident) {
      onEditIncident(incident);
    }
  }, [onEditIncident, incident]);

  const handleSave = async () => {
    try {
      const updatedFormData = {
        ...fullIncident.formData,
        reviewedBy,
        complianceChecklist: checklist,
        lastComplianceUpdate: new Date().toISOString()
      };

      await updateIncident({
        id: fullIncident.id,
        immediateAction: actionTaken,
        formData: updatedFormData,
        authType: 'admin'
      }).unwrap();

      console.log("Saved incident compliance data:", {
        incidentId: incident.id,
        reviewedBy,
        actionTaken,
        checklist: checklist.filter(item => item.completed)
      });
      
      showToast(t('workersComp.incidentDetails.saveSuccess'), "success");
    } catch (error) {
      console.error("Failed to save incident compliance data:", error);
      showToast(t('workersComp.incidentDetails.saveFailed'), "error");
    }
  };

  // Show loading state while fetching incident details
  if (isLoadingDetails) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('workersComp.incidentDetails.backToRecent')}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('workersComp.incidentDetails.title')}</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-gray-500">{t('workersComp.incidentDetails.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('workersComp.incidentDetails.backToRecent')}
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Incident Details</h1>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Incident Details Form */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <Label htmlFor="injuredEmployee">{t('workersComp.incidentDetails.injuredEmployee')}</Label>
            <Input 
              id="injuredEmployee"
              value={fullIncident.injuredEmployee} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="reportedBy">{t('workersComp.incidentDetails.reportedBy')}</Label>
            <Input 
              id="reportedBy"
              value={fullIncident.reportedBy} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="projectName">{t('workersComp.incidentDetails.projectName')}</Label>
            <Input 
              id="projectName"
              value={fullIncident.projectName} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="dateTime">{t('workersComp.incidentDetails.dateTime')}</Label>
            <Input 
              id="dateTime"
              value={new Date(fullIncident.dateOfIncident).toLocaleString()} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="reviewedBy">{t('workersComp.incidentDetails.reviewedBy')}</Label>
            <Input 
              id="reviewedBy"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder={t('workersComp.incidentDetails.reviewerPlaceholder')}
            />
          </div>
          
          <div>
            <Label htmlFor="actionTaken">{t('workersComp.incidentDetails.actionTaken')}</Label>
            <Input 
              id="actionTaken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder={t('workersComp.incidentDetails.actionPlaceholder')}
            />
          </div>
        </div>
        
        {/* Right side - Compliance & Checklist */}
        <div className="space-y-6">
          {/* Compliance Countdown */}
          <ComplianceCountdown createdAt={incident.createdAt} />
          
          {/* Incident Checklist */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('workersComp.incidentDetails.incidentChecklist')}</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400 font-medium w-8"></th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400 font-medium">{t('workersComp.incidentDetails.checklist.actionHeader')}</th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400 font-medium">{t('workersComp.incidentDetails.checklist.deadlineHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="py-3">
                        <Checkbox
                          id={item.id}
                          checked={item.completed}
                          onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <label
                          htmlFor={item.id}
                          className="text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {item.label}
                          {item.link && (
                            <button
                              onClick={handleSeeForm}
                              className="text-blue-600 dark:text-blue-400 ml-1 hover:underline"
                            >
                              - {item.link}
                            </button>
                          )}
                        </label>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {item.deadline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('workersComp.incidentDetails.saving') : t('workersComp.incidentDetails.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast notification */}
      <Toast 
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
        duration={3000}
      />
    </div>
  );
}