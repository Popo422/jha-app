"use client";

import React, { useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useGetModulesQuery } from "@/lib/features/modules/modulesApi";
import { ModuleInfo } from "@/components/admin/ModuleInfo";
import { ModuleConfiguration } from "@/components/admin/ModuleConfiguration";
import { ProjectsManagement } from "@/components/admin/ProjectsManagement";
import { SubcontractorsManagement } from "@/components/admin/SubcontractorsManagement";

export default function ModulesPage() {
  const { t } = useTranslation('common');
  const { data: modulesData, isLoading, refetch } = useGetModulesQuery();

  const handleConfigurationSuccess = useCallback(() => {
    refetch(); // Refresh data when configuration is updated
  }, [refetch]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.moduleManagement')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.moduleManagementDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Information Component */}
        <ModuleInfo 
          modulesData={modulesData} 
          isLoading={isLoading} 
        />

        {/* Module Configuration Component */}
        <ModuleConfiguration 
          modulesData={modulesData} 
          isLoading={isLoading} 
          onSuccess={handleConfigurationSuccess}
        />
      </div>

      {/* Projects Management Section */}
      <div className="mt-8">
        <ProjectsManagement />
      </div>

      {/* Subcontractors Management Section */}
      <div className="mt-8">
        <SubcontractorsManagement />
      </div>

    </div>
  );
}