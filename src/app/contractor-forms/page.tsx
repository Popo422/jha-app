"use client";

import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetCompanyModulesQuery } from "@/lib/features/company/companyApi";
import Link from "next/link";
import { useMemo } from "react";

export default function ContractorFormsPage() {
  const { t } = useTranslation("common");
  const { data: modulesData, isLoading } = useGetCompanyModulesQuery();

  const workmenForms = [
    {
      id: "start-of-day",
      title: t("forms.startOfDayReport"),
      href: "/contractor-forms/start-of-day-report",
      description: t("forms.startOfDayReportDescription"),
    },
    {
      id: "end-of-day",
      title: t("forms.endOfDayReport"),
      href: "/contractor-forms/end-of-day-report",
      description: t("forms.endOfDayReportDescription"),
    },
    {
      id: "timesheet",
      title: t("nav.timesheet"),
      href: "/timesheet",
      description: t("pages.timesheetDescription"),
    },
    {
      id: "job-hazard-analysis",
      title: t("forms.jobHazardAnalysis"),
      href: "/contractor-forms/job-hazard-analysis",
      description: t("forms.jobHazardAnalysisDescription"),
    },
    {
      id: "incident-report",
      title: t("forms.incidentReport"),
      href: "/contractor-forms/incident-report",
      description: t("forms.incidentReportDescription"),
    },
    {
      id: "near-miss-report",
      title: t("forms.nearMissReport"),
      href: "/contractor-forms/near-miss-report",
      description: t("forms.nearMissReportDescription"),
    },
  ];

  const subcontractorForms = [
    {
      id: "start-of-day-v2",
      title: "Foreman Start of Day Report",
      href: "/contractor-forms/start-of-day-v2",
      description: "Multi-step start of day report with enhanced safety protocol tracking",
    },
    {
      id: "end-of-day-v2",
      title: "Foreman End of Day Report",
      href: "/contractor-forms/end-of-day-v2",
      description: "Multi-step end of day report with enhanced shift review tracking",
    },
    {
      id: "incident-report",
      title: t("forms.incidentReport"),
      href: "/contractor-forms/incident-report",
      description: t("forms.incidentReportDescription"),
    },
    {
      id: "near-miss-report",
      title: t("forms.nearMissReport"),
      href: "/contractor-forms/near-miss-report",
      description: t("forms.nearMissReportDescription"),
    },
  ];

  const availableWorkmenForms = useMemo(() => {
    if (!modulesData?.enabledModules) return [];
    return workmenForms.filter((form) => {
      return modulesData.enabledModules.includes(form.id);
    });
  }, [modulesData]);

  const availableSubcontractorForms = useMemo(() => {
    if (!modulesData?.enabledModules) return [];
    return subcontractorForms.filter((form) => {
      // Show start-of-day-v2 if start-of-day is enabled
      if (form.id === 'start-of-day-v2') {
        return modulesData.enabledModules.includes('start-of-day');
      }
      // Show end-of-day-v2 if end-of-day is enabled
      if (form.id === 'end-of-day-v2') {
        return modulesData.enabledModules.includes('end-of-day');
      }
      return modulesData.enabledModules.includes(form.id);
    });
  }, [modulesData]);

  const renderFormCards = (forms: typeof workmenForms) => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, index) => (
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
      ));
    }

    if (forms.length === 0) {
      return (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <CardContent className="p-8">
            <p className="text-muted-foreground">{t("forms.noFormsAvailable")}</p>
          </CardContent>
        </Card>
      );
    }

    return forms.map((form) => (
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
            <Link href={form.href}>{t("forms.seeForm")}</Link>
          </Button>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground text-center">{t("nav.contractorForms")}</h1>

          <Tabs defaultValue="workmen" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workmen">{t("nav.workmenForms")}</TabsTrigger>
              <TabsTrigger value="subcontractor">{t("nav.subcontractorForms")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workmen" className="mt-8">
              <div className="grid gap-6">
                {renderFormCards(availableWorkmenForms)}
              </div>
            </TabsContent>
            
            <TabsContent value="subcontractor" className="mt-8">
              <div className="grid gap-6">
                {renderFormCards(availableSubcontractorForms)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
