"use client";

import React, { useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetModulesQuery, useUpdateModulesMutation } from "@/lib/features/modules/modulesApi";
import { ModuleInfo } from "@/components/admin/ModuleInfo";
import { ModuleConfiguration } from "@/components/admin/ModuleConfiguration";
import { EnabledFormTemplates } from "@/components/admin/EnabledFormTemplates";

export default function ModulesPage() {
  const { t } = useTranslation('common');
  const admin = useSelector((state: RootState) => state.auth.admin);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<string | null>(null);
  const [updateModules] = useUpdateModulesMutation();
  const { data: subcontractorsData, isLoading: isLoadingSubcontractors } = useGetModulesQuery({});
  const { data: modulesData, isLoading: isLoadingModules, refetch } = useGetModulesQuery(
    { subcontractorId: selectedSubcontractor || undefined },
    { skip: !selectedSubcontractor }
  );

  const handleConfigurationSuccess = useCallback(() => {
    refetch(); // Refresh data when configuration is updated
  }, [refetch]);

  const handleSubcontractorSelect = useCallback((subcontractorId: string) => {
    setSelectedSubcontractor(subcontractorId);
  }, []);

  const handleApplyTemplate = useCallback(async (templateModules: string[], selectedSubcontractors: string[]) => {
    // Apply template to multiple subcontractors
    const promises = selectedSubcontractors.map(subcontractorId => 
      updateModules({
        enabledModules: templateModules,
        subcontractorId
      }).unwrap()
    );

    await Promise.all(promises);
    refetch(); // Refresh data after bulk update
  }, [updateModules, refetch]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.moduleManagement')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.moduleManagementDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Module Info + Form Templates */}
        <div className="space-y-6">
          {/* Module Information Component */}
          <ModuleInfo 
            modulesData={modulesData} 
            isLoading={isLoadingModules} 
          />

          {/* Enabled Form Templates Component */}
          {/* <EnabledFormTemplates
            subcontractorsData={subcontractorsData}
            isLoading={isLoadingSubcontractors}
            onApplyTemplate={handleApplyTemplate}
          /> */}
        </div>

        {/* Right Column: Module Configuration */}
        <div>
          <ModuleConfiguration 
            modulesData={modulesData}
            subcontractorsData={subcontractorsData}
            isLoading={selectedSubcontractor ? isLoadingModules : isLoadingSubcontractors} 
            onSuccess={handleConfigurationSuccess}
            onSubcontractorSelect={handleSubcontractorSelect}
            adminCompanyName={admin?.companyName}
          />
        </div>
      </div>

    </div>
  );
}