"use client";

import { useTranslation } from 'react-i18next';
import { SubcontractorsManagement } from "@/components/admin/SubcontractorsManagement";

export default function SubcontractorsPage() {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.subcontractorsEditor')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.subcontractorsEditorDescription')}
        </p>
      </div>
      
      <SubcontractorsManagement />
    </div>
  );
}