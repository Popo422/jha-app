"use client";

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import type { ModulesResponse } from "@/lib/features/modules/modulesApi";

interface ModuleInfoProps {
  modulesData?: ModulesResponse;
  isLoading: boolean;
}

export function ModuleInfo({ modulesData, isLoading }: ModuleInfoProps) {
  const { t } = useTranslation('common');
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
{t('admin.moduleInformation')}
          </CardTitle>
          <CardDescription>
{t('admin.moduleConfigurationDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = modulesData?.enabledModules?.length || 0;
  const totalCount = modulesData?.availableModules?.length || 0;
  const lastUpdated = modulesData?.lastUpdated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="mr-2 h-5 w-5" />
          Module Information
        </CardTitle>
        <CardDescription>
          Current module configuration details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Module Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
{t('admin.enabledModules')}
          </span>
          <Badge variant={enabledCount > 0 ? "default" : "secondary"}>
            {enabledCount} of {totalCount}
          </Badge>
        </div>

        {/* Active Modules List */}
        {enabledCount > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">
{t('admin.activeModules')}
            </span>
            <div className="flex flex-wrap gap-2">
              {modulesData?.availableModules
                ?.filter(module => modulesData.enabledModules.includes(module.id))
                .map(module => (
                  <Badge key={module.id} variant="outline" className="text-xs">
                    {module.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Last Updated Info */}
        {lastUpdated?.at && lastUpdated?.by ? (
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="font-medium mr-2">{t('admin.lastUpdated')}:</span>
              <span>{format(new Date(lastUpdated.at), 'MMM d, yyyy at h:mm a')}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <User className="mr-2 h-4 w-4" />
              <span className="font-medium mr-2">{t('admin.updatedBy')}:</span>
              <span>{lastUpdated.by}</span>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
              <Clock className="mr-2 h-4 w-4" />
              <span>{t('admin.noModificationHistory')}</span>
            </div>
          </div>
        )}

        {/* Warning for no modules */}
        {enabledCount === 0 && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
{t('admin.noModulesEnabledWarning')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}