"use client";

import React, { useCallback } from "react";
import { useGetModulesQuery } from "@/lib/features/modules/modulesApi";
import { ModuleInfo } from "@/components/admin/ModuleInfo";
import { ModuleConfiguration } from "@/components/admin/ModuleConfiguration";

export default function ModulesPage() {
  const { data: modulesData, isLoading, refetch } = useGetModulesQuery();

  const handleConfigurationSuccess = useCallback(() => {
    refetch(); // Refresh data when configuration is updated
  }, [refetch]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Module Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          Configure and monitor which modules are available to contractors
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
    </div>
  );
}