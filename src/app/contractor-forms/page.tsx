"use client";

import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCompanyModulesQuery } from "@/lib/features/company/companyApi";
import Link from "next/link";
import { useMemo } from "react";

const allForms = [
  {
    id: "job-hazard-analysis",
    title: "Job Hazard Analysis",
    href: "/contractor-forms/job-hazard-analysis",
    description: "This form tracks all potential job hazards on the worksite. To be completed by all employees.",
  },
  {
    id: "start-of-day",
    title: "Start of Day Report",
    href: "/contractor-forms/start-of-day-report",
    description:
      "This form ensures all crewmen enter the worksite in healthy condition. To be completed by all employees.",
  },
  {
    id: "end-of-day",
    title: "End of Day Report",
    href: "/contractor-forms/end-of-day-report",
    description:
      "This form captures the general health of the crewmen leaving the job site. To be completed by all employees.",
  },
];

export default function ContractorFormsPage() {
  const { data: modulesData, isLoading } = useGetCompanyModulesQuery();

  const availableForms = useMemo(() => {
    if (!modulesData?.enabledModules) return [];
    return allForms.filter(form => modulesData.enabledModules.includes(form.id));
  }, [modulesData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground text-center">Contractor Forms</h1>

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
                    No forms are currently available. Please contact your administrator.
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
                      <Link href={form.href}>See Form</Link>
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
