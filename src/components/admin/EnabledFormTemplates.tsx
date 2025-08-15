"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toast, useToast } from "@/components/ui/toast";
import { FileText, Users, Check, AlertCircle, Plus, Save, Search } from "lucide-react";
import type { ModulesResponse, SubcontractorInfo } from "@/lib/features/modules/modulesApi";
import { useGetFormTemplatesQuery, useCreateFormTemplateMutation } from "@/lib/features/form-templates/formTemplatesApi";

interface EnabledFormTemplatesProps {
  subcontractorsData?: ModulesResponse;
  isLoading: boolean;
  onApplyTemplate: (templateModules: string[], selectedSubcontractors: string[]) => void;
}

interface FormTemplate {
  id: string;
  name: string;
  modules: string[];
  description: string;
}

const defaultTemplates: FormTemplate[] = [
  {
    id: "basic",
    name: "Basic",
    modules: ["start-of-day", "end-of-day", "job-hazard-analysis"],
    description: "Essential safety forms: Start of Day, End of Day, and Job Hazard Analysis"
  },
  {
    id: "full",
    name: "Full",
    modules: ["start-of-day", "end-of-day", "job-hazard-analysis", "incident-report", "quick-incident-report", "near-miss-report", "vehicle-inspection", "timesheet"],
    description: "Complete access to all available forms"
  }
];

export function EnabledFormTemplates({ subcontractorsData, isLoading, onApplyTemplate }: EnabledFormTemplatesProps) {
  const { t } = useTranslation('common');
  const { toast, showToast, hideToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  
  // Custom template creation
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateModules, setNewTemplateModules] = useState<string[]>([]);
  
  // Subcontractor search
  const [subcontractorSearch, setSubcontractorSearch] = useState('');
  
  // API hooks
  const { data: customTemplatesData, isLoading: isLoadingTemplates } = useGetFormTemplatesQuery();
  const [createTemplate, { isLoading: isCreatingTemplate }] = useCreateFormTemplateMutation();

  const handleSubcontractorToggle = useCallback((subcontractorId: string, checked: boolean) => {
    setSelectedSubcontractors(prev => 
      checked 
        ? [...prev, subcontractorId]
        : prev.filter(id => id !== subcontractorId)
    );
  }, []);
  // Filter subcontractors based on search
  const filteredSubcontractors = React.useMemo(() => {
    if (!subcontractorSearch.trim() || !subcontractorsData?.subcontractors) {
      return subcontractorsData?.subcontractors || [];
    }
    
    const searchLower = subcontractorSearch.toLowerCase();
    return subcontractorsData.subcontractors.filter(subcontractor => 
      subcontractor.name.toLowerCase().includes(searchLower)
    );
  }, [subcontractorsData, subcontractorSearch]);

  const handleSelectAll = useCallback(() => {
    if (!filteredSubcontractors) return;
    setSelectedSubcontractors(filteredSubcontractors.map(sub => sub.id));
  }, [filteredSubcontractors]);

  const handleDeselectAll = useCallback(() => {
    setSelectedSubcontractors([]);
  }, []);

  // Combine default and custom templates
  const allTemplates = React.useMemo(() => {
    const customTemplates = customTemplatesData?.templates?.map(t => ({
      id: t.id,
      name: t.name,
      modules: t.modules,
      description: t.description || ''
    })) || [];
    
    return [...defaultTemplates, ...customTemplates];
  }, [customTemplatesData]);


  const handleModuleToggle = useCallback((moduleId: string, checked: boolean) => {
    setNewTemplateModules(prev => 
      checked 
        ? [...prev, moduleId]
        : prev.filter(id => id !== moduleId)
    );
  }, []);

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim() || newTemplateModules.length === 0) {
      showToast('Please provide a template name and select at least one module', 'error');
      return;
    }

    try {
      await createTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || undefined,
        modules: newTemplateModules
      }).unwrap();

      // Reset form and close dialog
      const templateName = newTemplateName.trim();
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateModules([]);
      setIsCreateDialogOpen(false);
      showToast(`Custom template "${templateName}" created successfully`, 'success');
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to create template', 'error');
    }
  }, [newTemplateName, newTemplateDescription, newTemplateModules, createTemplate, showToast]);

  const handleApplyTemplate = useCallback(async () => {
    if (!selectedTemplate || selectedSubcontractors.length === 0) {
      showToast('Please select a template and at least one subcontractor', 'error');
      return;
    }

    const template = allTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsApplying(true);

    try {
      await onApplyTemplate(template.modules, selectedSubcontractors);
      showToast(`Applied "${template.name}" template to ${selectedSubcontractors.length} subcontractor(s)`, 'success');
      setSelectedTemplate('');
      setSelectedSubcontractors([]);
    } catch (error) {
      showToast('Failed to apply template. Please try again.', 'error');
    } finally {
      setIsApplying(false);
    }
  }, [selectedTemplate, selectedSubcontractors, onApplyTemplate, allTemplates, showToast]);

  const selectedTemplate_obj = allTemplates.find(t => t.id === selectedTemplate);

  const availableModules = [
    { id: 'start-of-day', name: 'Start of Day Report' },
    { id: 'end-of-day', name: 'End of Day Report' },
    { id: 'job-hazard-analysis', name: 'Job Hazard Analysis (JHA)' },
    { id: 'incident-report', name: 'Incident Report' },
    { id: 'quick-incident-report', name: 'Quick Incident Report' },
    { id: 'near-miss-report', name: 'Near Miss Report' },
    { id: 'vehicle-inspection', name: 'Vehicle Inspection' },
    { id: 'timesheet', name: 'Timesheet' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Enabled Form Templates
        </CardTitle>
        <CardDescription>
          Apply pre-configured module sets to multiple subcontractors at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Template Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Select Template
            </label>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Custom Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable template with your preferred module configuration.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Template Name</label>
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g., Field Workers, Office Staff..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      placeholder="Brief description of when to use this template..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Select Modules</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                      {availableModules.map((module) => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`module-${module.id}`}
                            checked={newTemplateModules.includes(module.id)}
                            onCheckedChange={(checked) => 
                              handleModuleToggle(module.id, !!checked)
                            }
                          />
                          <label 
                            htmlFor={`module-${module.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {module.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateName.trim() || newTemplateModules.length === 0 || isCreatingTemplate}
                    className="w-full"
                  >
                    {isCreatingTemplate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <SearchableSelect
            options={allTemplates.map(template => ({
              value: template.id,
              label: template.name,
            }))}
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            placeholder="Choose a form template..."
            searchPlaceholder="Search templates..."
            emptyText="No templates found."
          />
          
          {/* Template Preview */}
          {selectedTemplate_obj && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                {selectedTemplate_obj.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedTemplate_obj.modules.map(module => {
                  // Convert module ID to readable name
                  const moduleNames = {
                    'start-of-day': 'Start of Day',
                    'end-of-day': 'End of Day',
                    'job-hazard-analysis': 'Job Hazard Analysis',
                    'incident-report': 'Incident Report',
                    'quick-incident-report': 'Quick Incident Report',
                    'near-miss-report': 'Near Miss Report',
                    'vehicle-inspection': 'Vehicle Inspection',
                    'timesheet': 'Timesheet'
                  };
                  
                  return (
                    <Badge key={module} variant="default" className="text-xs">
                      {moduleNames[module as keyof typeof moduleNames] || module.replace(/-/g, ' ')}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Subcontractor Selection */}
        {subcontractorsData?.subcontractors && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Select Subcontractors ({selectedSubcontractors.length} selected)
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedSubcontractors.length === filteredSubcontractors.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedSubcontractors.length === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Subcontractor Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={subcontractorSearch}
                onChange={(e) => setSubcontractorSearch(e.target.value)}
                placeholder="Search subcontractors..."
                className="pl-10"
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
              {filteredSubcontractors.length > 0 ? (
                filteredSubcontractors.map((subcontractor) => (
                  <div key={subcontractor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sub-${subcontractor.id}`}
                      checked={selectedSubcontractors.includes(subcontractor.id)}
                      onCheckedChange={(checked) => 
                        handleSubcontractorToggle(subcontractor.id, !!checked)
                      }
                    />
                    <label 
                      htmlFor={`sub-${subcontractor.id}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {subcontractor.name}
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {subcontractorSearch ? 'No subcontractors match your search.' : 'No subcontractors available.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <Button 
          onClick={handleApplyTemplate}
          disabled={!selectedTemplate || selectedSubcontractors.length === 0 || isApplying}
          className="w-full"
        >
          {isApplying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Applying Template...
            </>
          ) : (
            `Apply Template to ${selectedSubcontractors.length} Subcontractor${selectedSubcontractors.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </CardContent>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </Card>
  );
}