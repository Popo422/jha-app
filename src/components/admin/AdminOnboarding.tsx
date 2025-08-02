"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  MapPin,
  Phone,
  Mail,
  User,
  Upload,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { ProjectManagerBulkUploadModal } from "./ProjectManagerBulkUploadModal";
import { ProjectManagerManualAddModal } from "./ProjectManagerManualAddModal";
import { ProjectBulkUploadModal } from "./ProjectBulkUploadModal";
import { ProjectManualAddModal } from "./ProjectManualAddModal";
import { SubcontractorBulkUploadModal } from "./SubcontractorBulkUploadModal";
import { SubcontractorManualAddModal } from "./SubcontractorManualAddModal";
import { EmployeeBulkUploadModal } from "./EmployeeBulkUploadModal";
import { EmployeeManualAddModal } from "./EmployeeManualAddModal";
import { useCreateAdminUserMutation, useBulkCreateAdminUsersMutation, useGetAdminUsersQuery } from "@/lib/features/admin-users/adminUsersApi";
import { useBulkCreateProjectsMutation } from "@/lib/features/projects/projectsApi";
import { useBulkCreateSubcontractorsMutation, useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import { useBulkCreateContractorsMutation } from "@/lib/features/contractors/contractorsApi";

type Step = "welcome" | "projectManagers" | "projects" | "subcontractors" | "employees" | "complete";

interface ProjectManagerData {
  name: string;
  email: string;
}

interface ProjectData {
  name: string;
  location: string;
  projectManager: string;
}

interface SubcontractorData {
  name: string; // This maps to the database 'name' field
}

interface EmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  rate?: string;
  companyName?: string; // Subcontractor assignment
  code?: string; // Auto-generated, will be created by API
}

interface OnboardingData {
  projectManagers: ProjectManagerData[];
  projects: ProjectData[];
  subcontractors: SubcontractorData[];
  employees: EmployeeData[];
}

type ShowTable = "managers" | "projects" | "subcontractors" | "employees";

export default function AdminOnboarding() {
  const { t } = useTranslation("common");

  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<{
    projectManagers?: string[];
    projects?: string[];
    subcontractors?: string[];
    employees?: string[];
  }>({});
  const [savedEntities, setSavedEntities] = useState({
    projectManagers: new Set<string>(),
    projects: new Set<string>(),
    subcontractors: new Set<string>(),
    employees: new Set<string>()
  });
  const [createAdminUser] = useCreateAdminUserMutation();
  const [bulkCreateAdminUsers, { isLoading: isSavingProjectManagers }] = useBulkCreateAdminUsersMutation();
  const [bulkCreateProjects, { isLoading: isSavingProjects }] = useBulkCreateProjectsMutation();
  const [bulkCreateSubcontractors, { isLoading: isSavingSubcontractors }] = useBulkCreateSubcontractorsMutation();
  const [bulkCreateContractors, { isLoading: isSavingEmployees }] = useBulkCreateContractorsMutation();
  const { data: savedAdminUsersData } = useGetAdminUsersQuery({ fetchAll: true, authType: 'admin' });
  const savedProjectManagers = savedAdminUsersData?.adminUsers.filter(user => user.role === 'admin') || [];
  const { data: savedSubcontractorsData } = useGetSubcontractorsQuery({ authType: 'admin' });
  const savedSubcontractors = savedSubcontractorsData?.subcontractors || [];
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isProjectBulkUploadModalOpen, setIsProjectBulkUploadModalOpen] = useState(false);
  const [isProjectManualAddModalOpen, setIsProjectManualAddModalOpen] = useState(false);
  const [isSubcontractorBulkUploadModalOpen, setIsSubcontractorBulkUploadModalOpen] = useState(false);
  const [isSubcontractorManualAddModalOpen, setIsSubcontractorManualAddModalOpen] = useState(false);
  const [isEmployeeBulkUploadModalOpen, setIsEmployeeBulkUploadModalOpen] = useState(false);
  const [isEmployeeManualAddModalOpen, setIsEmployeeManualAddModalOpen] = useState(false);
  const [showTable, setShowTable] = useState<ShowTable | null>(null);
  const [editingManagerIndex, setEditingManagerIndex] = useState<number | null>(null);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [editingSubcontractorIndex, setEditingSubcontractorIndex] = useState<number | null>(null);
  const [editingEmployeeIndex, setEditingEmployeeIndex] = useState<number | null>(null);
  const [editingManager, setEditingManager] = useState<ProjectManagerData | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [editingSubcontractor, setEditingSubcontractor] = useState<SubcontractorData | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    projectManagers: [],
    projects: [],
    subcontractors: [],
    employees: [],
  });

  // Temporary form states
  const [newProjectManager, setNewProjectManager] = useState<ProjectManagerData>({
    name: "",
    email: "",
  });
  const [newProject, setNewProject] = useState<ProjectData>({ name: "", location: "", projectManager: "" });
  const [newSubcontractor, setNewSubcontractor] = useState<SubcontractorData>({
    name: "",
  });
  const [newEmployee, setNewEmployee] = useState<EmployeeData>({
    firstName: "",
    lastName: "",
    email: "",
    rate: "",
    companyName: "",
  });

  const steps: Step[] = ["welcome", "projectManagers", "projects", "subcontractors", "employees", "complete"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Helper functions to check if items are already saved
  const isManagerSaved = (email: string) => savedEntities.projectManagers.has(email.toLowerCase());
  const isProjectSaved = (name: string, location: string) => savedEntities.projects.has(`${name.toLowerCase()}|${location.toLowerCase()}`);
  const isSubcontractorSaved = (name: string) => savedEntities.subcontractors.has(name.toLowerCase());
  const isEmployeeSaved = (email: string) => savedEntities.employees.has(email.toLowerCase());

  // Helper functions to detect duplicates within current session (based on actual DB constraints)
  const getDuplicateManagers = () => {
    // DB Constraint: companyId + email must be unique within same company
    const emailCounts = new Map<string, number>();
    onboardingData.projectManagers.forEach(manager => {
      const email = manager.email.toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    });
    return Array.from(emailCounts.entries()).filter(([email, count]) => count > 1).map(([email]) => email);
  };

  const getDuplicateProjects = () => {
    // DB Constraint: companyId + name must be unique within same company
    const nameCounts = new Map<string, number>();
    onboardingData.projects.forEach(project => {
      const name = project.name.toLowerCase();
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });
    return Array.from(nameCounts.entries()).filter(([name, count]) => count > 1).map(([name]) => name);
  };

  const getDuplicateSubcontractors = () => {
    // DB Constraint: companyId + name must be unique within same company
    const nameCounts = new Map<string, number>();
    onboardingData.subcontractors.forEach(sub => {
      const name = sub.name.toLowerCase();
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });
    return Array.from(nameCounts.entries()).filter(([name, count]) => count > 1).map(([name]) => name);
  };

  const getDuplicateEmployees = () => {
    // DB Constraint: companyId + email must be unique within same company
    const emailCounts = new Map<string, number>();
    onboardingData.employees.forEach(emp => {
      const email = emp.email.toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    });
    return Array.from(emailCounts.entries()).filter(([email, count]) => count > 1).map(([email]) => email);
  };

  // Check if an individual item is a duplicate in current session
  const isManagerDuplicate = (email: string) => getDuplicateManagers().includes(email.toLowerCase());
  const isProjectDuplicate = (name: string) => getDuplicateProjects().includes(name.toLowerCase());
  const isSubcontractorDuplicate = (name: string) => getDuplicateSubcontractors().includes(name.toLowerCase());
  const isEmployeeDuplicate = (email: string) => getDuplicateEmployees().includes(email.toLowerCase());

  // Get counts of duplicates to show in warnings
  const duplicateManagersCount = getDuplicateManagers().length;
  const duplicateProjectsCount = getDuplicateProjects().length;
  const duplicateSubcontractorsCount = getDuplicateSubcontractors().length;
  const duplicateEmployeesCount = getDuplicateEmployees().length;

  // Check if current step has duplicates that prevent progression
  const hasDuplicates = () => {
    switch (currentStep) {
      case 'projectManagers':
        return duplicateManagersCount > 0 || (apiErrors.projectManagers && apiErrors.projectManagers.length > 0);
      case 'projects':
        return duplicateProjectsCount > 0 || (apiErrors.projects && apiErrors.projects.length > 0);
      case 'subcontractors':
        return duplicateSubcontractorsCount > 0 || (apiErrors.subcontractors && apiErrors.subcontractors.length > 0);
      case 'employees':
        return duplicateEmployeesCount > 0 || (apiErrors.employees && apiErrors.employees.length > 0);
      default:
        return false;
    }
  };

  const handleSaveProjectManagers = async (): Promise<boolean> => {
    if (onboardingData.projectManagers.length === 0) return true;

    // Clear any previous API errors
    setApiErrors(prev => ({ ...prev, projectManagers: undefined }));

    // Filter out already saved managers (by email)
    const unsavedManagers = onboardingData.projectManagers.filter(
      manager => !savedEntities.projectManagers.has(manager.email.toLowerCase())
    );

    if (unsavedManagers.length === 0) {
      console.log("All project managers already saved");
      return true;
    }

    try {
      const result = await bulkCreateAdminUsers({
        adminUsers: unsavedManagers.map((manager) => ({
          name: manager.name,
          email: manager.email,
          role: 'admin' as const
        })),
      }).unwrap();

      // Mark successfully created admin users as saved
      if (result.adminUsers && result.adminUsers.length > 0) {
        setSavedEntities(prev => ({
          ...prev,
          projectManagers: new Set([
            ...prev.projectManagers,
            ...result.adminUsers.map(u => u.email.toLowerCase())
          ])
        }));
      }

      console.log(`${result.created} project managers saved successfully`);
      if (result.skipped && result.skipped > 0) {
        console.log(`${result.skipped} project managers skipped (duplicates)`);
      }
      
      // Clear any previous errors on success
      setApiErrors(prev => ({ ...prev, projectManagers: undefined }));
      
      // Show warnings if any duplicates were encountered during creation
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Project manager warnings:', result.warnings);
        setApiErrors(prev => ({ ...prev, projectManagers: result.warnings }));
      }
      return true;
    } catch (error: any) {
      console.error("Error saving project managers:", error);
      
      // Handle specific API error responses and show them to user
      let errorMessages: string[] = [];
      
      if (error?.data?.errors) {
        errorMessages = Array.isArray(error.data.errors) ? error.data.errors : [error.data.errors];
      } else if (error?.data?.message) {
        errorMessages = [error.data.message];
      } else if (error?.data?.error) {
        errorMessages = [error.data.error];
      } else if (error?.message) {
        errorMessages = [error.message];
      } else {
        errorMessages = ['An unexpected error occurred while saving project managers'];
      }
      
      setApiErrors(prev => ({ ...prev, projectManagers: errorMessages }));
      return false;
    }
  };

  const handleSaveProjects = async (): Promise<boolean> => {
    if (onboardingData.projects.length === 0) return true;

    // Clear any previous API errors
    setApiErrors(prev => ({ ...prev, projects: undefined }));

    // Filter out already saved projects (by name + location combination)
    const unsavedProjects = onboardingData.projects.filter(
      project => !savedEntities.projects.has(`${project.name.toLowerCase()}|${project.location.toLowerCase()}`)
    );

    if (unsavedProjects.length === 0) {
      console.log("All projects already saved");
      return true;
    }

    try {
      const result = await bulkCreateProjects({
        projects: unsavedProjects.map((project) => ({
          name: project.name,
          location: project.location,
          projectManager: project.projectManager,
        })),
      }).unwrap();

      // Mark successfully created projects as saved
      if (result.projects && result.projects.length > 0) {
        setSavedEntities(prev => ({
          ...prev,
          projects: new Set([
            ...prev.projects,
            ...result.projects.map(p => `${p.name.toLowerCase()}|${p.location.toLowerCase()}`)
          ])
        }));
      }

      console.log(`${result.created} projects saved successfully`);
      if (result.skipped > 0) {
        console.log(`${result.skipped} projects skipped (duplicates)`);
      }
      
      // Clear any previous errors on success
      setApiErrors(prev => ({ ...prev, projects: undefined }));
      
      // Show warnings if any duplicates were encountered during creation
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Project warnings:', result.warnings);
        setApiErrors(prev => ({ ...prev, projects: result.warnings }));
      }
      return true;
    } catch (error: any) {
      console.error("Error saving projects:", error);
      
      // Handle specific API error responses and show them to user
      let errorMessages: string[] = [];
      
      if (error?.data?.errors) {
        errorMessages = Array.isArray(error.data.errors) ? error.data.errors : [error.data.errors];
      } else if (error?.data?.message) {
        errorMessages = [error.data.message];
      } else if (error?.data?.error) {
        errorMessages = [error.data.error];
      } else if (error?.message) {
        errorMessages = [error.message];
      } else {
        errorMessages = ['An unexpected error occurred while saving projects'];
      }
      
      setApiErrors(prev => ({ ...prev, projects: errorMessages }));
      return false;
    }
  };

  const handleSaveSubcontractors = async (): Promise<boolean> => {
    if (onboardingData.subcontractors.length === 0) return true;

    // Clear any previous API errors
    setApiErrors(prev => ({ ...prev, subcontractors: undefined }));

    // Filter out already saved subcontractors (by name)
    const unsavedSubcontractors = onboardingData.subcontractors.filter(
      sub => !savedEntities.subcontractors.has(sub.name.toLowerCase())
    );

    if (unsavedSubcontractors.length === 0) {
      console.log("All subcontractors already saved");
      return true;
    }

    try {
      const result = await bulkCreateSubcontractors({
        subcontractors: unsavedSubcontractors
      }).unwrap();

      // Mark successfully created subcontractors as saved
      if (result.subcontractors && result.subcontractors.length > 0) {
        setSavedEntities(prev => ({
          ...prev,
          subcontractors: new Set([
            ...prev.subcontractors,
            ...result.subcontractors.map(s => s.name.toLowerCase())
          ])
        }));
      }

      console.log(`${result.created} subcontractors saved successfully`);
      if (result.skipped > 0) {
        console.log(`${result.skipped} subcontractors skipped (duplicates)`);
      }
      
      // Clear any previous errors on success
      setApiErrors(prev => ({ ...prev, subcontractors: undefined }));
      
      // Show warnings if any duplicates were encountered during creation
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Subcontractor warnings:', result.warnings);
        setApiErrors(prev => ({ ...prev, subcontractors: result.warnings }));
      }
      return true;
    } catch (error: any) {
      console.error("Error saving subcontractors:", error);
      
      // Handle specific API error responses and show them to user
      let errorMessages: string[] = [];
      
      if (error?.data?.errors) {
        errorMessages = Array.isArray(error.data.errors) ? error.data.errors : [error.data.errors];
      } else if (error?.data?.message) {
        errorMessages = [error.data.message];
      } else if (error?.data?.error) {
        errorMessages = [error.data.error];
      } else if (error?.message) {
        errorMessages = [error.message];
      } else {
        errorMessages = ['An unexpected error occurred while saving subcontractors'];
      }
      
      setApiErrors(prev => ({ ...prev, subcontractors: errorMessages }));
      return false;
    }
  };

  const handleSaveEmployees = async (): Promise<boolean> => {
    if (onboardingData.employees.length === 0) return true;

    // Clear any previous API errors
    setApiErrors(prev => ({ ...prev, employees: undefined }));

    // Filter out already saved employees (by email)
    const unsavedEmployees = onboardingData.employees.filter(
      emp => !savedEntities.employees.has(emp.email.toLowerCase())
    );

    if (unsavedEmployees.length === 0) {
      console.log("All employees already saved");
      return true;
    }

    try {
      const result = await bulkCreateContractors({
        contractors: unsavedEmployees.map((emp) => ({
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          rate: emp.rate || '0.00',
          companyName: emp.companyName,
        })),
      }).unwrap();

      // Mark successfully created employees as saved
      if (result.contractors && result.contractors.length > 0) {
        setSavedEntities(prev => ({
          ...prev,
          employees: new Set([
            ...prev.employees,
            ...result.contractors.map(e => e.email.toLowerCase())
          ])
        }));
      }

      console.log(`${result.created} employees saved successfully`);
      if (result.skipped > 0) {
        console.log(`${result.skipped} employees skipped (duplicates)`);
      }
      
      // Clear any previous errors on success
      setApiErrors(prev => ({ ...prev, employees: undefined }));
      
      // Show warnings if any duplicates were encountered during creation
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Employee warnings:', result.warnings);
        setApiErrors(prev => ({ ...prev, employees: result.warnings }));
      }
      return true;
    } catch (error: any) {
      console.error("Error saving employees:", error);
      
      // Handle specific API error responses and show them to user
      let errorMessages: string[] = [];
      
      if (error?.data?.errors) {
        errorMessages = Array.isArray(error.data.errors) ? error.data.errors : [error.data.errors];
      } else if (error?.data?.message) {
        errorMessages = [error.data.message];
      } else if (error?.data?.error) {
        errorMessages = [error.data.error];
      } else if (error?.message) {
        errorMessages = [error.message];
      } else {
        errorMessages = ['An unexpected error occurred while saving employees'];
      }
      
      setApiErrors(prev => ({ ...prev, employees: errorMessages }));
      return false;
    }
  };

  const handleNext = async () => {
    let saveSuccess = true;
    
    // Try to save current step data and check if successful
    if (currentStep === "projectManagers" && onboardingData.projectManagers.length > 0) {
      saveSuccess = await handleSaveProjectManagers();
    } else if (currentStep === "projects" && onboardingData.projects.length > 0) {
      saveSuccess = await handleSaveProjects();
    } else if (currentStep === "subcontractors" && onboardingData.subcontractors.length > 0) {
      saveSuccess = await handleSaveSubcontractors();
    } else if (currentStep === "employees" && onboardingData.employees.length > 0) {
      saveSuccess = await handleSaveEmployees();
    }

    // Only proceed to next step if save was successful
    if (saveSuccess) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex]);
      }
    }
    // If save failed, stay on current step and let user see the error messages
  };

  const handleSkip = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleManualAddSaveAndContinue = (managers: ProjectManagerData[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      projectManagers: [...prev.projectManagers, ...managers],
    }));
    setIsManualAddModalOpen(false);
    setShowTable("managers");
  };

  const handleManualAddSaveAndAddMore = (manager: ProjectManagerData) => {
    setOnboardingData((prev) => ({
      ...prev,
      projectManagers: [...prev.projectManagers, manager],
    }));
  };

  const addProject = () => {
    if (newProject.name.trim()) {
      setOnboardingData((prev) => ({
        ...prev,
        projects: [...prev.projects, newProject],
      }));
      setNewProject({ name: "", location: "", projectManager: "" });
      // Clear API errors when adding new data
      setApiErrors(prev => ({ ...prev, projects: undefined }));
    }
  };

  const addSubcontractor = () => {
    if (newSubcontractor.name.trim()) {
      setOnboardingData((prev) => ({
        ...prev,
        subcontractors: [...prev.subcontractors, newSubcontractor],
      }));
      setNewSubcontractor({ name: "" });
      // Clear API errors when adding new data
      setApiErrors(prev => ({ ...prev, subcontractors: undefined }));
    }
  };

  const addEmployee = () => {
    if (newEmployee.firstName.trim() && newEmployee.lastName.trim() && newEmployee.email.trim()) {
      setOnboardingData((prev) => ({
        ...prev,
        employees: [...prev.employees, newEmployee],
      }));
      setNewEmployee({ firstName: "", lastName: "", email: "", rate: "", companyName: "" });
      // Clear API errors when adding new data
      setApiErrors(prev => ({ ...prev, employees: undefined }));
    }
  };

  const removeProjectManager = (index: number) => {
    setOnboardingData((prev) => ({
      ...prev,
      projectManagers: prev.projectManagers.filter((_, i) => i !== index),
    }));
    if (editingManagerIndex === index) {
      setEditingManagerIndex(null);
      setEditingManager(null);
    }
    // Clear API errors when user removes data - might resolve conflicts
    setApiErrors(prev => ({ ...prev, projectManagers: undefined }));
  };

  const startEditingManager = (index: number) => {
    setEditingManagerIndex(index);
    setEditingManager({ ...onboardingData.projectManagers[index] });
  };

  const cancelEditingManager = () => {
    setEditingManagerIndex(null);
    setEditingManager(null);
  };

  const startEditingProject = (index: number) => {
    setEditingProjectIndex(index);
    setEditingProject({ ...onboardingData.projects[index] });
  };

  const cancelEditingProject = () => {
    setEditingProjectIndex(null);
    setEditingProject(null);
  };

  const startEditingSubcontractor = (index: number) => {
    setEditingSubcontractorIndex(index);
    setEditingSubcontractor({ ...onboardingData.subcontractors[index] });
  };

  const cancelEditingSubcontractor = () => {
    setEditingSubcontractorIndex(null);
    setEditingSubcontractor(null);
  };

  const startEditingEmployee = (index: number) => {
    setEditingEmployeeIndex(index);
    setEditingEmployee({ ...onboardingData.employees[index] });
  };

  const cancelEditingEmployee = () => {
    setEditingEmployeeIndex(null);
    setEditingEmployee(null);
  };

  const saveEditingManager = () => {
    if (editingManagerIndex !== null && editingManager) {
      setOnboardingData((prev) => ({
        ...prev,
        projectManagers: prev.projectManagers.map((manager, index) =>
          index === editingManagerIndex ? editingManager : manager
        ),
      }));
      setEditingManagerIndex(null);
      setEditingManager(null);
      // Clear API errors when user edits data - gives them a chance to fix the issues
      setApiErrors(prev => ({ ...prev, projectManagers: undefined }));
    }
  };

  const saveEditingProject = () => {
    if (editingProjectIndex !== null && editingProject) {
      setOnboardingData((prev) => ({
        ...prev,
        projects: prev.projects.map((project, index) =>
          index === editingProjectIndex ? editingProject : project
        ),
      }));
      setEditingProjectIndex(null);
      setEditingProject(null);
      // Clear API errors when user edits data
      setApiErrors(prev => ({ ...prev, projects: undefined }));
    }
  };

  const saveEditingSubcontractor = () => {
    if (editingSubcontractorIndex !== null && editingSubcontractor) {
      setOnboardingData((prev) => ({
        ...prev,
        subcontractors: prev.subcontractors.map((subcontractor, index) =>
          index === editingSubcontractorIndex ? editingSubcontractor : subcontractor
        ),
      }));
      setEditingSubcontractorIndex(null);
      setEditingSubcontractor(null);
      // Clear API errors when user edits data
      setApiErrors(prev => ({ ...prev, subcontractors: undefined }));
    }
  };

  const saveEditingEmployee = () => {
    if (editingEmployeeIndex !== null && editingEmployee) {
      setOnboardingData((prev) => ({
        ...prev,
        employees: prev.employees.map((employee, index) =>
          index === editingEmployeeIndex ? editingEmployee : employee
        ),
      }));
      setEditingEmployeeIndex(null);
      setEditingEmployee(null);
      // Clear API errors when user edits data
      setApiErrors(prev => ({ ...prev, employees: undefined }));
    }
  };

  const handleBulkUploadSuccess = (managers: { name: string; email: string; phone?: string }[]) => {
    const convertedManagers: ProjectManagerData[] = managers.map(manager => ({
      name: manager.name,
      email: manager.email
    }));
    setOnboardingData((prev) => ({
      ...prev,
      projectManagers: [...prev.projectManagers, ...convertedManagers],
    }));
    setIsBulkUploadModalOpen(false);
    setShowTable("managers");
  };

  const handleProjectBulkUploadSuccess = (projects: { name: string; location: string }[]) => {
    const convertedProjects: ProjectData[] = projects.map(project => ({
      name: project.name,
      location: project.location,
      projectManager: '' // Set empty string as default, can be filled later via editing
    }));
    setOnboardingData((prev) => ({
      ...prev,
      projects: [...prev.projects, ...convertedProjects],
    }));
    setIsProjectBulkUploadModalOpen(false);
    setShowTable("projects");
  };

  const handleSubcontractorBulkUploadSuccess = (subcontractors: { name: string }[]) => {
    const convertedSubcontractors: SubcontractorData[] = subcontractors.map(sub => ({
      name: sub.name
    }));
    setOnboardingData((prev) => ({
      ...prev,
      subcontractors: [...prev.subcontractors, ...convertedSubcontractors],
    }));
    setIsSubcontractorBulkUploadModalOpen(false);
    setShowTable("subcontractors");
  };

  const handleEmployeeBulkUploadSuccess = (employees: { firstName: string; lastName: string; email: string; rate?: string; companyName?: string }[]) => {
    const convertedEmployees: EmployeeData[] = employees.map(emp => ({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      rate: emp.rate,
      companyName: emp.companyName
    }));
    setOnboardingData((prev) => ({
      ...prev,
      employees: [...prev.employees, ...convertedEmployees],
    }));
    setIsEmployeeBulkUploadModalOpen(false);
    setShowTable("employees");
  };

  const handleProjectManualAddSaveAndContinue = (projects: ProjectData[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      projects: [...prev.projects, ...projects],
    }));
    setIsProjectManualAddModalOpen(false);
    setShowTable("projects");
  };

  const handleProjectManualAddSaveAndAddMore = (project: ProjectData) => {
    setOnboardingData((prev) => ({
      ...prev,
      projects: [...prev.projects, project],
    }));
  };

  const handleSubcontractorManualAddSaveAndContinue = (subcontractors: SubcontractorData[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      subcontractors: [...prev.subcontractors, ...subcontractors],
    }));
    setIsSubcontractorManualAddModalOpen(false);
    setShowTable("subcontractors");
  };

  const handleSubcontractorManualAddSaveAndAddMore = (subcontractor: SubcontractorData) => {
    setOnboardingData((prev) => ({
      ...prev,
      subcontractors: [...prev.subcontractors, subcontractor],
    }));
  };

  const handleEmployeeManualAddSaveAndContinue = (employees: EmployeeData[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      employees: [...prev.employees, ...employees],
    }));
    setIsEmployeeManualAddModalOpen(false);
    setShowTable("employees");
  };

  const handleEmployeeManualAddSaveAndAddMore = (employee: EmployeeData) => {
    setOnboardingData((prev) => ({
      ...prev,
      employees: [...prev.employees, employee],
    }));
  };

  const removeProject = (index: number) => {
    setOnboardingData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
    if (editingProjectIndex === index) {
      setEditingProjectIndex(null);
      setEditingProject(null);
    }
    // Clear API errors when user removes data
    setApiErrors(prev => ({ ...prev, projects: undefined }));
  };

  const removeSubcontractor = (index: number) => {
    setOnboardingData((prev) => ({
      ...prev,
      subcontractors: prev.subcontractors.filter((_, i) => i !== index),
    }));
    if (editingSubcontractorIndex === index) {
      setEditingSubcontractorIndex(null);
      setEditingSubcontractor(null);
    }
    // Clear API errors when user removes data
    setApiErrors(prev => ({ ...prev, subcontractors: undefined }));
  };

  const removeEmployee = (index: number) => {
    setOnboardingData((prev) => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index),
    }));
    if (editingEmployeeIndex === index) {
      setEditingEmployeeIndex(null);
      setEditingEmployee(null);
    }
    // Clear API errors when user removes data
    setApiErrors(prev => ({ ...prev, employees: undefined }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      let saveSuccess = true;
      
      // Save employees if not already saved
      if (onboardingData.employees.length > 0) {
        saveSuccess = await handleSaveEmployees();
      }

      // Only proceed to complete if save was successful
      if (saveSuccess) {
        setCurrentStep("complete");
      }
      // If save failed, stay on current step and let user see the error messages
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{t("admin.onboarding")}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("admin.onboardingDescription")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold">{t("admin.projectManagersSetup")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.projectManagersDescription")}</p>
        </div>

        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold">{t("admin.projectsSetup")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.projectsDescription")}</p>
        </div>

        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold">{t("admin.subcontractorsSetup")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.subcontractorsDescription")}</p>
        </div>

        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold">{t("admin.employeesSetup")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.employeesDescription")}</p>
        </div>
      </div>

      <Button onClick={handleNext} size="lg" className="px-8">
        {t("admin.addProjectManagers")}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );

  const renderProjectManagersStep = () => {
    if (showTable && showTable === "managers" && onboardingData.projectManagers.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <User className="w-12 h-12 mx-auto text-indigo-600" />
            <h2 className="text-2xl font-bold">Review Project Managers</h2>
            <p className="text-muted-foreground">Review and edit your project managers before continuing</p>
          </div>

          <div className="space-y-4">
            {duplicateManagersCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">
                    {getDuplicateManagers().length} duplicate email{getDuplicateManagers().length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please remove or edit duplicate entries before continuing. Each project manager must have a unique email address.
                </p>
              </div>
            )}
            
            {apiErrors.projectManagers && apiErrors.projectManagers.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300 mb-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">Save Error</span>
                </div>
                <ul className="space-y-1">
                  {apiErrors.projectManagers.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Added Project Managers ({onboardingData.projectManagers.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsManualAddModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
                <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Name
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Email
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboardingData.projectManagers.map((manager, index) => (
                      <tr key={index} className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isManagerSaved(manager.email) 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                          : isManagerDuplicate(manager.email) 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                            : ''
                      }`}>
                        {editingManagerIndex === index ? (
                          <>
                            <td className="p-4">
                              <Input
                                value={editingManager?.name || ""}
                                onChange={(e) =>
                                  setEditingManager((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.managerNamePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                type="email"
                                value={editingManager?.email || ""}
                                onChange={(e) =>
                                  setEditingManager((prev) => (prev ? { ...prev, email: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder="manager@company.com"
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEditingManager}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingManager}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{manager.name}</span>
                                {isManagerSaved(manager.email) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-300">
                                    Saved
                                  </span>
                                )}
                                {!isManagerSaved(manager.email) && isManagerDuplicate(manager.email) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-300">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{manager.email}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingManager(index)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProjectManager(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="px-6"
                size="lg"
                disabled={isSavingProjectManagers}
              >
                Skip & Continue
              </Button>
              <Button onClick={handleNext} className="px-8" size="lg" disabled={isSavingProjectManagers || duplicateManagersCount > 0 || (apiErrors.projectManagers && apiErrors.projectManagers.length > 0)}>
                {isSavingProjectManagers ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving Project Managers...
                  </>
                ) : duplicateManagersCount > 0 ? (
                  <>
                    Fix Duplicates to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : apiErrors.projectManagers && apiErrors.projectManagers.length > 0 ? (
                  <>
                    Fix Errors to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Finish & Continue to Projects
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <User className="w-12 h-12 mx-auto text-indigo-600" />
          <h2 className="text-2xl font-bold">{t("admin.addProjectManagers")}</h2>
          <p className="text-muted-foreground">{t("admin.projectManagersDescription")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsManualAddModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <User className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.addManually")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.addManagersOneByOne")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
            <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
          </div>

          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsBulkUploadModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.bulkUpload")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.uploadMultipleManagers")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("admin.chooseFile")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {onboardingData.projectManagers.length > 0 && (
          <div className="text-center">
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                {onboardingData.projectManagers.length} manager{onboardingData.projectManagers.length !== 1 ? "s" : ""}{" "}
                added
              </p>
              <Button onClick={() => setShowTable("managers")} variant="outline" size="sm">
                Review Managers
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProjectsStep = () => {
    if (showTable && showTable === "projects" && onboardingData.projects.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="w-12 h-12 mx-auto text-blue-600" />
            <h2 className="text-2xl font-bold">Review Projects</h2>
            <p className="text-muted-foreground">Review and edit your projects before continuing</p>
          </div>

          <div className="space-y-4">
            {duplicateProjectsCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">
                    {getDuplicateProjects().length} duplicate project name{getDuplicateProjects().length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please remove or edit duplicate entries before continuing. Each project must have a unique name.
                </p>
              </div>
            )}
            
            {apiErrors.projects && apiErrors.projects.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300 mb-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">Save Error</span>
                </div>
                <ul className="space-y-1">
                  {apiErrors.projects.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Added Projects ({onboardingData.projects.length})</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsProjectManualAddModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
                <Button variant="outline" onClick={() => setIsProjectBulkUploadModalOpen(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Project Name
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Project Manager
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Location
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboardingData.projects.map((project, index) => (
                      <tr key={index} className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isProjectSaved(project.name, project.location) 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                          : isProjectDuplicate(project.name) 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                            : ''
                      }`}>
                        {editingProjectIndex === index ? (
                          <>
                            <td className="p-4">
                              <Input
                                value={editingProject?.name || ""}
                                onChange={(e) =>
                                  setEditingProject((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.projectNamePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <select
                                value={editingProject?.projectManager || ""}
                                onChange={(e) =>
                                  setEditingProject((prev) => (prev ? { ...prev, projectManager: e.target.value } : null))
                                }
                                className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
                              >
                                <option value="">{t('admin.selectProjectManager')}</option>
                                {[...savedProjectManagers, ...onboardingData.projectManagers].map((manager, index) => (
                                  <option key={`${manager.email}-${index}`} value={manager.name}>
                                    {manager.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4">
                              <Input
                                value={editingProject?.location || ""}
                                onChange={(e) =>
                                  setEditingProject((prev) => (prev ? { ...prev, location: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.addressPlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEditingProject}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingProject}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{project.name}</span>
                                {isProjectSaved(project.name, project.location) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-300">
                                    Saved
                                  </span>
                                )}
                                {!isProjectSaved(project.name, project.location) && isProjectDuplicate(project.name) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-300">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{project.projectManager}</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{project.location}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingProject(index)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProject(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="px-6"
                size="lg"
                disabled={isSavingProjects}
              >
                Skip & Continue
              </Button>
              <Button onClick={handleNext} className="px-8" size="lg" disabled={isSavingProjects || duplicateProjectsCount > 0 || (apiErrors.projects && apiErrors.projects.length > 0)}>
                {isSavingProjects ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving Projects...
                  </>
                ) : duplicateProjectsCount > 0 ? (
                  <>
                    Fix Duplicates to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : apiErrors.projects && apiErrors.projects.length > 0 ? (
                  <>
                    Fix Errors to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Finish & Continue to Subcontractors
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Building2 className="w-12 h-12 mx-auto text-blue-600" />
          <h2 className="text-2xl font-bold">{t("admin.addProjects")}</h2>
          <p className="text-muted-foreground">{t("admin.projectsDescription")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsProjectManualAddModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Building2 className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.addManually")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.addProjectsOneByOne")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
            <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
          </div>

          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsProjectBulkUploadModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.bulkUpload")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.uploadMultipleProjects")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("admin.chooseFile")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {onboardingData.projects.length > 0 && (
          <div className="text-center">
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                {onboardingData.projects.length} project{onboardingData.projects.length !== 1 ? "s" : ""} added
              </p>
              <Button onClick={() => setShowTable("projects")} variant="outline" size="sm">
                Review Projects
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubcontractorsStep = () => {
    if (showTable && showTable === "subcontractors" && onboardingData.subcontractors.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Users className="w-12 h-12 mx-auto text-purple-600" />
            <h2 className="text-2xl font-bold">Review Subcontractors</h2>
            <p className="text-muted-foreground">Review and edit your subcontractors before continuing</p>
          </div>

          <div className="space-y-4">
            {duplicateSubcontractorsCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">
                    {getDuplicateSubcontractors().length} duplicate company name{getDuplicateSubcontractors().length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please remove or edit duplicate entries before continuing. Each subcontractor must have a unique company name.
                </p>
              </div>
            )}
            
            {apiErrors.subcontractors && apiErrors.subcontractors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300 mb-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">Save Error</span>
                </div>
                <ul className="space-y-1">
                  {apiErrors.subcontractors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Added Subcontractors ({onboardingData.subcontractors.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsSubcontractorManualAddModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
                <Button variant="outline" onClick={() => setIsSubcontractorBulkUploadModalOpen(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Subcontractor Name
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboardingData.subcontractors.map((subcontractor, index) => (
                      <tr key={index} className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isSubcontractorSaved(subcontractor.name) 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                          : isSubcontractorDuplicate(subcontractor.name) 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                            : ''
                      }`}>
                        {editingSubcontractorIndex === index ? (
                          <>
                            <td className="p-4">
                              <Input
                                value={editingSubcontractor?.name || ""}
                                onChange={(e) =>
                                  setEditingSubcontractor((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.subcontractorNamePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEditingSubcontractor}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingSubcontractor}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{subcontractor.name}</span>
                                {isSubcontractorSaved(subcontractor.name) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-300">
                                    Saved
                                  </span>
                                )}
                                {!isSubcontractorSaved(subcontractor.name) && isSubcontractorDuplicate(subcontractor.name) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-300">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingSubcontractor(index)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSubcontractor(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="px-6"
                size="lg"
                disabled={isSavingSubcontractors}
              >
                Skip & Continue
              </Button>
              <Button onClick={handleNext} className="px-8" size="lg" disabled={isSavingSubcontractors || duplicateSubcontractorsCount > 0 || (apiErrors.subcontractors && apiErrors.subcontractors.length > 0)}>
                {isSavingSubcontractors ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving Subcontractors...
                  </>
                ) : duplicateSubcontractorsCount > 0 ? (
                  <>
                    Fix Duplicates to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : apiErrors.subcontractors && apiErrors.subcontractors.length > 0 ? (
                  <>
                    Fix Errors to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Finish & Continue to Employees
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Users className="w-12 h-12 mx-auto text-purple-600" />
          <h2 className="text-2xl font-bold">{t("admin.addSubcontractors")}</h2>
          <p className="text-muted-foreground">{t("admin.subcontractorsDescription")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsSubcontractorManualAddModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Users className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.addManually")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.addSubcontractorsOneByOne")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
            <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
          </div>

          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsSubcontractorBulkUploadModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.bulkUpload")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.uploadMultipleSubcontractors")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("admin.chooseFile")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {onboardingData.subcontractors.length > 0 && (
          <div className="text-center">
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                {onboardingData.subcontractors.length} subcontractor
                {onboardingData.subcontractors.length !== 1 ? "s" : ""} added
              </p>
              <Button onClick={() => setShowTable("subcontractors")} variant="outline" size="sm">
                Review Subcontractors
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEmployeesStep = () => {
    if (showTable && showTable === "employees" && onboardingData.employees.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <User className="w-12 h-12 mx-auto text-green-600" />
            <h2 className="text-2xl font-bold">Review Employees</h2>
            <p className="text-muted-foreground">Review and edit your employees before continuing</p>
          </div>

          <div className="space-y-4">
            {duplicateEmployeesCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">
                    {getDuplicateEmployees().length} duplicate email{getDuplicateEmployees().length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please remove or edit duplicate entries before continuing. Each employee must have a unique email address.
                </p>
              </div>
            )}
            
            {apiErrors.employees && apiErrors.employees.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300 mb-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">Save Error</span>
                </div>
                <ul className="space-y-1">
                  {apiErrors.employees.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Added Employees ({onboardingData.employees.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEmployeeManualAddModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
                <Button variant="outline" onClick={() => setIsEmployeeBulkUploadModalOpen(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        First Name
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Last Name
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Email
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Rate
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Subcontractor
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboardingData.employees.map((employee, index) => (
                      <tr key={index} className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isEmployeeSaved(employee.email) 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                          : isEmployeeDuplicate(employee.email) 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                            : ''
                      }`}>
                        {editingEmployeeIndex === index ? (
                          <>
                            <td className="p-4">
                              <Input
                                value={editingEmployee?.firstName || ""}
                                onChange={(e) =>
                                  setEditingEmployee((prev) => (prev ? { ...prev, firstName: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.firstNamePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                value={editingEmployee?.lastName || ""}
                                onChange={(e) =>
                                  setEditingEmployee((prev) => (prev ? { ...prev, lastName: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.lastNamePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                type="email"
                                value={editingEmployee?.email || ""}
                                onChange={(e) =>
                                  setEditingEmployee((prev) => (prev ? { ...prev, email: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder="employee@company.com"
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                value={editingEmployee?.rate || ""}
                                onChange={(e) =>
                                  setEditingEmployee((prev) => (prev ? { ...prev, rate: e.target.value } : null))
                                }
                                className="w-full"
                                placeholder={t('admin.hourlyRatePlaceholder')}
                              />
                            </td>
                            <td className="p-4">
                              <select
                                value={editingEmployee?.companyName || ""}
                                onChange={(e) =>
                                  setEditingEmployee((prev) => (prev ? { ...prev, companyName: e.target.value } : null))
                                }
                                className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
                              >
                                <option value="">{t('admin.selectASubcontractor')}</option>
                                {[...savedSubcontractors, ...onboardingData.subcontractors].map((subcontractor, index) => (
                                  <option key={`${subcontractor.name}-${index}`} value={subcontractor.name}>
                                    {subcontractor.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEditingEmployee}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingEmployee}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{employee.firstName}</span>
                                {isEmployeeSaved(employee.email) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-300">
                                    Saved
                                  </span>
                                )}
                                {!isEmployeeSaved(employee.email) && isEmployeeDuplicate(employee.email) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-300">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{employee.lastName}</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{employee.email}</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{employee.rate || "-"}</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{employee.companyName || "-"}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingEmployee(index)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEmployee(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="px-6"
                size="lg"
                disabled={isSavingEmployees || isLoading}
              >
                Skip & Continue
              </Button>
              <Button onClick={handleComplete} className="px-8" size="lg" disabled={isSavingEmployees || isLoading || duplicateEmployeesCount > 0 || (apiErrors.employees && apiErrors.employees.length > 0)}>
                {isSavingEmployees || isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    {isSavingEmployees ? "Saving Employees..." : "Completing Setup..."}
                  </>
                ) : duplicateEmployeesCount > 0 ? (
                  <>
                    Fix Duplicates to Complete
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                ) : apiErrors.employees && apiErrors.employees.length > 0 ? (
                  <>
                    Fix Errors to Complete
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <User className="w-12 h-12 mx-auto text-green-600" />
          <h2 className="text-2xl font-bold">{t("admin.addEmployees")}</h2>
          <p className="text-muted-foreground">{t("admin.employeesDescription")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsEmployeeManualAddModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <User className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.addManually")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.addEmployeesOneByOne")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
            <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
          </div>

          <div className="flex-1">
            <Card
              className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer h-full"
              onClick={() => setIsEmployeeBulkUploadModalOpen(true)}
            >
              <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold mb-2 text-lg">{t("admin.bulkUpload")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("admin.uploadMultipleEmployees")}</p>
                <Button variant="outline" size="sm" className="mt-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("admin.chooseFile")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {onboardingData.employees.length > 0 && (
          <div className="text-center">
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                {onboardingData.employees.length} employee{onboardingData.employees.length !== 1 ? "s" : ""} added
              </p>
              <Button onClick={() => setShowTable("employees")} variant="outline" size="sm">
                Review Employees
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-green-600">Onboarding Complete!</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your projects, subcontractors, and employees have been successfully set up.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-4">Summary</h3>
        <div className="space-y-2 text-sm text-left">
          <div className="flex justify-between">
            <span>Project Managers added:</span>
            <span className="font-medium">{onboardingData.projectManagers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Projects added:</span>
            <span className="font-medium">{onboardingData.projects.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Subcontractors added:</span>
            <span className="font-medium">{onboardingData.subcontractors.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Employees added:</span>
            <span className="font-medium">{onboardingData.employees.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {currentStep !== "welcome" && currentStep !== "complete" && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Step {currentStepIndex} of {steps.length - 2}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8 md:p-12">
          {currentStep === "welcome" && renderWelcomeStep()}
          {currentStep === "projectManagers" && renderProjectManagersStep()}
          {currentStep === "projects" && renderProjectsStep()}
          {currentStep === "subcontractors" && renderSubcontractorsStep()}
          {currentStep === "employees" && renderEmployeesStep()}
          {currentStep === "complete" && renderCompleteStep()}
        </CardContent>
      </Card>

      {currentStep !== "welcome" && currentStep !== "complete" && (
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStepIndex === 1}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Previous
          </Button>

          {currentStep === "employees" ? (
            <Button onClick={handleComplete} disabled={isLoading} className="px-8">
              {isLoading ? "Completing Setup..." : "Complete Setup"}
              <CheckCircle className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button 
                onClick={handleSkip} 
                variant="outline" 
                className="px-6" 
                disabled={isLoading || isSavingProjects || isSavingSubcontractors || isSavingEmployees}
              >
                Skip
              </Button>
              <Button 
                onClick={handleNext} 
                className="px-8" 
                disabled={isLoading || isSavingProjectManagers || isSavingProjects || isSavingSubcontractors || isSavingEmployees || hasDuplicates()}
              >
                {(isSavingProjectManagers && currentStep === "projectManagers") || 
                 (isSavingProjects && currentStep === "projects") ||
                 (isSavingSubcontractors && currentStep === "subcontractors") ||
                 (isSavingEmployees && (currentStep as Step) === "employees") ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : hasDuplicates() ? (
                  <>
                    Fix Duplicates to Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <ProjectManagerManualAddModal
        isOpen={isManualAddModalOpen}
        onClose={() => setIsManualAddModalOpen(false)}
        onSaveAndContinue={handleManualAddSaveAndContinue}
        onSaveAndAddMore={handleManualAddSaveAndAddMore}
      />

      <ProjectManagerBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUploadSuccess={handleBulkUploadSuccess}
      />

      <ProjectBulkUploadModal
        isOpen={isProjectBulkUploadModalOpen}
        onClose={() => setIsProjectBulkUploadModalOpen(false)}
        onUploadSuccess={handleProjectBulkUploadSuccess}
      />

      <SubcontractorBulkUploadModal
        isOpen={isSubcontractorBulkUploadModalOpen}
        onClose={() => setIsSubcontractorBulkUploadModalOpen(false)}
        onUploadSuccess={handleSubcontractorBulkUploadSuccess}
      />

      <EmployeeBulkUploadModal
        isOpen={isEmployeeBulkUploadModalOpen}
        onClose={() => setIsEmployeeBulkUploadModalOpen(false)}
        onUploadSuccess={handleEmployeeBulkUploadSuccess}
        availableSubcontractors={onboardingData.subcontractors.map(s => ({ name: s.name }))}
      />

      <ProjectManualAddModal
        isOpen={isProjectManualAddModalOpen}
        onClose={() => setIsProjectManualAddModalOpen(false)}
        onSaveAndContinue={handleProjectManualAddSaveAndContinue}
        onSaveAndAddMore={handleProjectManualAddSaveAndAddMore}
        availableProjectManagers={[...savedProjectManagers, ...onboardingData.projectManagers]}
      />

      <SubcontractorManualAddModal
        isOpen={isSubcontractorManualAddModalOpen}
        onClose={() => setIsSubcontractorManualAddModalOpen(false)}
        onSaveAndContinue={handleSubcontractorManualAddSaveAndContinue}
        onSaveAndAddMore={handleSubcontractorManualAddSaveAndAddMore}
      />

      <EmployeeManualAddModal
        isOpen={isEmployeeManualAddModalOpen}
        onClose={() => setIsEmployeeManualAddModalOpen(false)}
        onSaveAndContinue={handleEmployeeManualAddSaveAndContinue}
        onSaveAndAddMore={handleEmployeeManualAddSaveAndAddMore}
        availableSubcontractors={onboardingData.subcontractors.map(s => ({ name: s.name }))}
        savedSubcontractors={savedSubcontractors}
      />
    </div>
  );
}