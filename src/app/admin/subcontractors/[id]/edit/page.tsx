"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/lib/hooks';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronDown, Building2 } from "lucide-react";
import Link from "next/link";
import { useGetSubcontractorsQuery, useUpdateSubcontractorMutation } from '@/lib/features/subcontractors/subcontractorsApi';
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from '@/components/ui/toast';
import { TRADE_OPTIONS } from "@/lib/constants/trades";

interface SubcontractorFormData {
  name: string;
  contractAmount: string;
  projectIds: string[];
  foreman: string;
  foremanEmail: string;
  address: string;
  contact: string;
  email: string;
  phone: string;
  trade: string;
  contractorLicenseNo: string;
  specialtyLicenseNo: string;
  federalTaxId: string;
  motorCarrierPermitNo: string;
  isUnion: boolean;
  isSelfInsured: boolean;
  workersCompPolicy: string;
}

interface EditSubcontractorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditSubcontractorPage({ params }: EditSubcontractorPageProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const backUrl = searchParams.get('back') || '/admin/subcontractors';
  
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const { auth } = useAppSelector((state) => state);
  const [updateSubcontractor, { isLoading: isSubmitting }] = useUpdateSubcontractorMutation();
  const { showToast } = useToast();

  // Get subcontractor data
  const { data: subcontractorsData, isLoading } = useGetSubcontractorsQuery({
    authType: 'admin',
    page: 1,
    pageSize: 1000, // Get all to find the specific one
  });

  const { data: projectsData } = useGetProjectsQuery({
    page: 1,
    pageSize: 100,
    authType: 'admin'
  });

  const [formData, setFormData] = useState<SubcontractorFormData>({
    name: "",
    contractAmount: "",
    projectIds: [],
    foreman: "",
    foremanEmail: "",
    address: "",
    contact: "",
    email: "",
    phone: "",
    trade: "",
    contractorLicenseNo: "",
    specialtyLicenseNo: "",
    federalTaxId: "",
    motorCarrierPermitNo: "",
    isUnion: false,
    isSelfInsured: false,
    workersCompPolicy: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Find the subcontractor and populate form
  useEffect(() => {
    if (resolvedParams && subcontractorsData && !isInitialized) {
      const subcontractor = subcontractorsData.subcontractors.find(s => s.id === resolvedParams.id);
      if (subcontractor) {
        setFormData({
          name: subcontractor.name,
          contractAmount: subcontractor.contractAmount || "",
          projectIds: subcontractor.projectIds || [],
          foreman: subcontractor.foreman || "",
          foremanEmail: (subcontractor as any).foremanEmail || "",
          address: subcontractor.address || "",
          contact: subcontractor.contact || "",
          email: subcontractor.email || "",
          phone: subcontractor.phone || "",
          trade: subcontractor.trade || "",
          contractorLicenseNo: subcontractor.contractorLicenseNo || "",
          specialtyLicenseNo: subcontractor.specialtyLicenseNo || "",
          federalTaxId: subcontractor.federalTaxId || "",
          motorCarrierPermitNo: subcontractor.motorCarrierPermitNo || "",
          isUnion: subcontractor.isUnion || false,
          isSelfInsured: subcontractor.isSelfInsured || false,
          workersCompPolicy: subcontractor.workersCompPolicy || "",
        });
        setIsInitialized(true);
      }
    }
  }, [resolvedParams, subcontractorsData, isInitialized]);

  const updateFormData = (updates: Partial<SubcontractorFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Subcontractor name is required';
    }

    // Validate foreman email if provided (optional)
    if (formData.foremanEmail && formData.foremanEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.foremanEmail)) {
        errors.foremanEmail = 'Please enter a valid email address for the foreman';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !resolvedParams) {
      return;
    }

    try {
      await updateSubcontractor({
        id: resolvedParams.id,
        ...formData
      }).unwrap();
      showToast('Subcontractor updated successfully!', 'success');
      router.push(backUrl);
    } catch (error: any) {
      console.error('Subcontractor update error:', error);
      showToast(error?.data?.error || 'Failed to update subcontractor', 'error');
    }
  };

  // Show loading state
  if (isLoading || !resolvedParams || !isInitialized) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-gray-600">Loading subcontractor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if subcontractor exists
  const subcontractor = subcontractorsData?.subcontractors.find(s => s.id === resolvedParams.id);
  if (!subcontractor) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-gray-600">Subcontractor not found</p>
            <Link href={backUrl} className="text-blue-600 hover:underline mt-4 inline-block">
              Back to Subcontractors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allProjects = projectsData?.projects || [];
  const projectOptions = allProjects.map(project => ({
    value: project.id,
    label: project.name
  }));

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={backUrl}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subcontractors
          </Link>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Subcontractor
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Company/Subcontractor Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="Enter subcontractor name"
                    className={formErrors.name ? "border-red-500" : ""}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contractAmount">Contract Amount (Optional)</Label>
                  <Input
                    id="contractAmount"
                    value={formData.contractAmount}
                    onChange={(e) => updateFormData({ contractAmount: e.target.value })}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData({ address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>

                <div>
                  <Label htmlFor="contact">Contact Person (Optional)</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => updateFormData({ contact: e.target.value })}
                    placeholder="Enter contact person"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Project Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="projectIds">Assign to Projects (Optional)</Label>
                <MultiSelect
                  options={projectOptions}
                  value={formData.projectIds}
                  onValueChange={(value) => updateFormData({ projectIds: value })}
                  placeholder="Select projects..."
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Foreman Information */}
          <Card>
            <CardHeader>
              <CardTitle>Foreman Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="foreman">Foreman Name (Optional)</Label>
                  <Input
                    id="foreman"
                    value={formData.foreman}
                    onChange={(e) => updateFormData({ foreman: e.target.value })}
                    placeholder="Enter foreman name"
                    className={formErrors.foreman ? "border-red-500" : ""}
                  />
                  {formErrors.foreman && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.foreman}</p>
                  )}
                </div>

                {formData.foreman && formData.foreman.trim() && (
                  <div>
                    <Label htmlFor="foremanEmail">Foreman Email (Optional)</Label>
                    <Input
                      id="foremanEmail"
                      type="email"
                      value={formData.foremanEmail}
                      onChange={(e) => updateFormData({ foremanEmail: e.target.value })}
                      placeholder="Enter foreman email address"
                      className={formErrors.foremanEmail ? "border-red-500" : ""}
                    />
                    {formErrors.foremanEmail && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.foremanEmail}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      If no email provided, a default email will be generated. Adding a foreman will automatically create a contractor account.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trade">Trade/Specialty (Optional)</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        {formData.trade || "Select trade"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                      <DropdownMenuItem onClick={() => updateFormData({ trade: '' })}>
                        Not specified
                      </DropdownMenuItem>
                      {TRADE_OPTIONS.map((trade) => (
                        <DropdownMenuItem 
                          key={trade}
                          onClick={() => updateFormData({ trade })}
                        >
                          {trade}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <Label htmlFor="contractorLicenseNo">Contractor License # (Optional)</Label>
                  <Input
                    id="contractorLicenseNo"
                    value={formData.contractorLicenseNo}
                    onChange={(e) => updateFormData({ contractorLicenseNo: e.target.value })}
                    placeholder="Enter license number"
                  />
                </div>

                <div>
                  <Label htmlFor="specialtyLicenseNo">Specialty License # (Optional)</Label>
                  <Input
                    id="specialtyLicenseNo"
                    value={formData.specialtyLicenseNo}
                    onChange={(e) => updateFormData({ specialtyLicenseNo: e.target.value })}
                    placeholder="Enter specialty license number"
                  />
                </div>

                <div>
                  <Label htmlFor="federalTaxId">Federal Tax ID (Optional)</Label>
                  <Input
                    id="federalTaxId"
                    value={formData.federalTaxId}
                    onChange={(e) => updateFormData({ federalTaxId: e.target.value })}
                    placeholder="Enter federal tax ID"
                  />
                </div>

                <div>
                  <Label htmlFor="motorCarrierPermitNo">Motor Carrier Permit # (Optional)</Label>
                  <Input
                    id="motorCarrierPermitNo"
                    value={formData.motorCarrierPermitNo}
                    onChange={(e) => updateFormData({ motorCarrierPermitNo: e.target.value })}
                    placeholder="Enter motor carrier permit number"
                  />
                </div>

                <div>
                  <Label htmlFor="workersCompPolicy">Workers' Comp Policy # (Optional)</Label>
                  <Input
                    id="workersCompPolicy"
                    value={formData.workersCompPolicy}
                    onChange={(e) => updateFormData({ workersCompPolicy: e.target.value })}
                    placeholder="Enter policy number"
                  />
                </div>
              </div>

              {/* Boolean flags */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isUnion"
                    checked={formData.isUnion}
                    onCheckedChange={(checked) => updateFormData({ isUnion: checked === true })}
                  />
                  <Label htmlFor="isUnion" className="text-sm font-normal">
                    Union contractor
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isSelfInsured"
                    checked={formData.isSelfInsured}
                    onCheckedChange={(checked) => updateFormData({ isSelfInsured: checked === true })}
                  />
                  <Label htmlFor="isSelfInsured" className="text-sm font-normal">
                    Self-insured for workers' compensation
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(backUrl)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Subcontractor'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}