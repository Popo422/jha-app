"use client";

import { useState, useEffect, useCallback } from "react";
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
  link?: string;
}

export default function IncidentViewDetails({ incident, onBack, onEditIncident }: IncidentViewDetailsProps) {
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
    { id: "review", label: "Review Incident Reports", completed: false, link: "See Form" },
    { id: "trir", label: "Get TRIR or past incident rate", completed: false },
    { id: "labor", label: "Estimate total labor hours for the project", completed: false },
    { id: "financial", label: "Estimate financial impact per incident", completed: false },
    { id: "training", label: "Plan worker training and safety controls", completed: false },
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
      
      showToast("Compliance data saved successfully", "success");
    } catch (error) {
      console.error("Failed to save incident compliance data:", error);
      showToast("Failed to save compliance data", "error");
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
            Back to Recent Incidents
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Incident Details</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-gray-500">Loading incident details...</div>
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
          Back to Recent Incidents
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Incident Details</h1>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Incident Details Form */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <Label htmlFor="injuredEmployee">Injured Employee</Label>
            <Input 
              id="injuredEmployee"
              value={fullIncident.injuredEmployee} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="reportedBy">Reported By</Label>
            <Input 
              id="reportedBy"
              value={fullIncident.reportedBy} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="projectName">Project Name</Label>
            <Input 
              id="projectName"
              value={fullIncident.projectName} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="dateTime">Date & Time</Label>
            <Input 
              id="dateTime"
              value={new Date(fullIncident.dateOfIncident).toLocaleString()} 
              readOnly
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>
          
          <div>
            <Label htmlFor="reviewedBy">Reviewed By</Label>
            <Input 
              id="reviewedBy"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="Name of officer"
            />
          </div>
          
          <div>
            <Label htmlFor="actionTaken">Action Taken</Label>
            <Input 
              id="actionTaken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Name of officer"
            />
          </div>
        </div>
        
        {/* Right side - Compliance & Checklist */}
        <div className="space-y-6">
          {/* Compliance Countdown */}
          <ComplianceCountdown createdAt={incident.createdAt} />
          
          {/* Incident Checklist */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Incident Checklist</h3>
            
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-5"
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
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
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