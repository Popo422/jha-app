"use client";

import { useTranslation } from 'react-i18next';
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCompanyModulesQuery } from "@/lib/features/company/companyApi";
import Link from "next/link";
import { useMemo } from "react";


export default function ContractorFormsPage() {
  const { t } = useTranslation('common');
  const { data: modulesData, isLoading } = useGetCompanyModulesQuery();
  
  const allForms = [
    {
      id: "job-hazard-analysis",
      title: t('forms.jobHazardAnalysis'),
      href: "/contractor-forms/job-hazard-analysis",
      description: t('forms.jobHazardAnalysisDescription'),
    },
    {
      id: "start-of-day",
      title: t('forms.startOfDayReport'),
      href: "/contractor-forms/start-of-day-report",
      description: t('forms.startOfDayReportDescription'),
    },
    {
      id: "end-of-day",
      title: t('forms.endOfDayReport'),
      href: "/contractor-forms/end-of-day-report",
      description: t('forms.endOfDayReportDescription'),
    },
    {
      id: "incident-report",
      title: t('forms.incidentReport'),
      href: "/contractor-forms/incident-report",
      description: t('forms.incidentReportDescription'),
    },
    {
      id: "quick-incident-report",
      title: t('forms.quickIncidentReport'),
      href: "/contractor-forms/quick-incident-report",
      description: t('forms.quickIncidentReportDescription'),
    },
  ];

  const availableForms = useMemo(() => {
    console.log('modulesData', modulesData)
    if (!modulesData?.enabledModules) return [];
    return allForms.filter(form => modulesData.enabledModules.includes(form.id));
  }, [modulesData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground text-center">{t('nav.contractorForms')}</h1>

          <div className="grid gap-6">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <Card
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center"
                >
                  <CardHeader>
                    <Skeleton className="h-6 w-48 mx-auto mb-2" />
                    <Skeleton className="h-4 w-96 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-24 mx-auto" />
                  </CardContent>
                </Card>
              ))
            ) : availableForms.length === 0 ? (
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <CardContent className="p-8">
                  <p className="text-muted-foreground">
                    {t('forms.noFormsAvailable')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              availableForms.map((form) => (
                <Card
                  key={form.title}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center"
                >
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">{form.title}</CardTitle>
                    <CardDescription>{form.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      asChild
                      className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                      <Link href={form.href}>{t('forms.seeForm')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
