"use client";

import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const forms = [
  {
    title: "Job Hazard Analysis",
    href: "/contractor-forms/job-hazard-analysis",
    description: "This form tracks all potential job hazards on the worksite. To be completed by all employees.",
  },
  {
    title: "Start of Day Report",
    href: "/contractor-forms/start-of-day-report",
    description:
      "This form ensures all crewmen enter the worksite in healthy condition. To be completed by all employees.",
  },
  {
    title: "End of Day Report",
    href: "/contractor-forms/end-of-day-report",
    description:
      "This form captures the general health of the crewmen leaving the job site. To be completed by all employees.",
  },
];

export default function ContractorFormsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground text-center">Contractor Forms</h1>

          <div className="grid gap-6 ">
            {forms.map((form) => (
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
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
