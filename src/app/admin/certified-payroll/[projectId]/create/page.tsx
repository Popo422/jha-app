"use client";

import { use } from "react";
import CertifiedPayrollWizard from "@/components/admin/CertifiedPayrollWizard";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function CertifiedPayrollCreatePage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <CertifiedPayrollWizard projectId={resolvedParams.projectId} />
      </div>
    </div>
  );
}