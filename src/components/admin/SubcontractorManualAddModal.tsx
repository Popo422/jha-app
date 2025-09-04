"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select-v2";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Users, User, Mail, Phone, Plus, ArrowRight } from "lucide-react";

interface SubcontractorData {
  name: string;
  contractAmount?: string;
  projectIds?: string[];
  foreman?: string;
}

interface ProjectData {
  name: string;
  location: string;
  projectManager: string;
  projectCost?: string;
}

interface SubcontractorManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndContinue: (subcontractors: SubcontractorData[]) => void;
  onSaveAndAddMore: (subcontractor: SubcontractorData) => void;
  availableProjects?: ProjectData[];
}

export function SubcontractorManualAddModal({
  isOpen,
  onClose,
  onSaveAndContinue,
  onSaveAndAddMore,
  availableProjects = [],
}: SubcontractorManualAddModalProps) {
  const { t } = useTranslation("common");

  const [tempSubcontractors, setTempSubcontractors] = useState<SubcontractorData[]>([]);
  const [currentSubcontractor, setCurrentSubcontractor] = useState<SubcontractorData>({
    name: "",
    contractAmount: "",
    projectIds: [],
    foreman: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateSubcontractor = (subcontractor: SubcontractorData): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};

    if (!subcontractor.name.trim()) {
      newErrors.name = t('admin.companyNameRequired');
    }

    return newErrors;
  };

  const handleSaveAndAddMore = () => {
    const validationErrors = validateSubcontractor(currentSubcontractor);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newSubcontractor = { ...currentSubcontractor };
    setTempSubcontractors((prev) => [...prev, newSubcontractor]);
    onSaveAndAddMore(newSubcontractor);

    // Reset form
    setCurrentSubcontractor({ name: "", contractAmount: "", projectIds: [], foreman: "" });
    setErrors({});
  };

  const handleSaveAndContinue = () => {
    const validationErrors = validateSubcontractor(currentSubcontractor);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const allSubcontractors = [...tempSubcontractors, currentSubcontractor];
    onSaveAndContinue(allSubcontractors);

    // Reset state
    setTempSubcontractors([]);
    setCurrentSubcontractor({ name: "", contractAmount: "", projectIds: [], foreman: "" });
    setErrors({});
  };

  const handleClose = () => {
    setCurrentSubcontractor({ name: "", contractAmount: "", projectIds: [], foreman: "" });
    setTempSubcontractors([]);
    setErrors({});
    onClose();
  };

  const removeSubcontractor = (index: number) => {
    setTempSubcontractors((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = currentSubcontractor.name.trim()
  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">{t('admin.addSubcontractors')}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {t('admin.addSubcontractorsDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">
          <div className="space-y-6">
            {tempSubcontractors.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{tempSubcontractors.length}</span>
                  </div>
                  <span className="font-medium">
                    {tempSubcontractors.length} {t('admin.subcontractorsAddedSoFar')}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    {t('admin.companyName')} *
                  </Label>
                  <Input
                    id="name"
                    value={currentSubcontractor.name}
                    onChange={(e) => {
                      setCurrentSubcontractor((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder={t('admin.enterCompanyName')}
                    className={`${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Assign to Projects (Optional)
                  </Label>
                  <MultiSelect
                    options={availableProjects.map((project) => ({
                      value: `${project.name}|${project.location}`,
                      label: `${project.name} - ${project.location}`
                    }))}
                    value={currentSubcontractor.projectIds || []}
                    onValueChange={(value) => {
                      setCurrentSubcontractor(prev => ({
                        ...prev,
                        projectIds: value
                      }));
                    }}
                    placeholder="Select projects..."
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Assign this subcontractor to specific projects
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractAmount" className="text-sm font-medium">
                    Contract Amount (Optional)
                  </Label>
                  <Input
                    id="contractAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentSubcontractor.contractAmount}
                    onChange={(e) => {
                      setCurrentSubcontractor((prev) => ({ ...prev, contractAmount: e.target.value }));
                    }}
                    placeholder="Enter contract amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foreman" className="text-sm font-medium">
                    Foreman (Optional)
                  </Label>
                  <Input
                    id="foreman"
                    value={currentSubcontractor.foreman}
                    onChange={(e) => {
                      setCurrentSubcontractor((prev) => ({ ...prev, foreman: e.target.value }));
                    }}
                    placeholder="Enter foreman name"
                  />
                  <p className="text-xs text-gray-500">
                    Adding a foreman will automatically create a contractor account
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-2 sm:order-1">
            Cancel
          </Button>

          <Button
            onClick={handleSaveAndAddMore}
            disabled={!isFormValid}
            variant="outline"
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Save & Add More
          </Button>

          <Button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid}
            className="w-full sm:w-auto order-1 sm:order-3 bg-green-600 hover:bg-green-700"
          >
            Save & Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
