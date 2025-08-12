"use client";

import { useTranslation } from 'react-i18next';
import { ProjectsManagement } from "@/components/admin/ProjectsManagement";

export default function ProjectsPage() {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.projectsEditor')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.projectsEditorDescription')}
        </p>
      </div>
      
      <ProjectsManagement />
    </div>
  );
}