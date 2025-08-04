"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useGetSubmissionsQuery } from "@/lib/features/submissions/submissionsApi";
import { useGetCompanyModulesQuery } from "@/lib/features/company/companyApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store";

interface FormStatus {
  startOfDay: boolean;
  endOfDay: boolean;
  jha: boolean;
}

export default function SafetyFormChecklist() {
  const { t } = useTranslation('common');
  const [formStatus, setFormStatus] = useState<FormStatus>({
    startOfDay: false,
    endOfDay: false,
    jha: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const token = useSelector((state: RootState) => state.auth.token);

  // Get company's enabled modules
  const { data: modulesData, isLoading: modulesLoading } = useGetCompanyModulesQuery();

  // Define available forms with their module mappings
  const availableForms = useMemo(() => {
    const enabledModules = modulesData?.enabledModules || [];
    const forms = [];

    if (enabledModules.includes('start-of-day')) {
      forms.push({
        key: 'startOfDay',
        submissionType: 'start-of-day',
        title: t('forms.startOfDayReport'),
        description: t('forms.startOfDayReportDescription'),
        href: '/contractor-forms/start-of-day-report'
      });
    }

    if (enabledModules.includes('job-hazard-analysis')) {
      forms.push({
        key: 'jha',
        submissionType: 'job-hazard-analysis',
        title: t('forms.jobHazardAnalysis'),
        description: t('forms.jobHazardAnalysisDescription'),
        href: '/contractor-forms/job-hazard-analysis'
      });
    }

    if (enabledModules.includes('end-of-day')) {
      forms.push({
        key: 'endOfDay',
        submissionType: 'end-of-day',
        title: t('forms.endOfDayReport'),
        description: t('forms.endOfDayReportDescription'),
        href: '/contractor-forms/end-of-day-report'
      });
    }

    return forms;
  }, [modulesData]);

  const {
    data: submissions,
    isLoading,
    error,
    refetch,
  } = useGetSubmissionsQuery({
    limit: 100,
    offset: 0,
  });

  useEffect(() => {
    if (submissions?.submissions) {
      const todaySubmissions = submissions.submissions.filter((submission) => submission.date === today);

      const status = {
        startOfDay: todaySubmissions.some((s) => s.submissionType === "start-of-day"),
        endOfDay: todaySubmissions.some((s) => s.submissionType === "end-of-day"),
        jha: todaySubmissions.some((s) => s.submissionType === "job-hazard-analysis"),
      };

      setFormStatus(status);
    }
  }, [submissions, today]);

  // // SSE connection for real-time updates
  // useEffect(() => {
  //   if (!token) {
  //     console.log('No token available for SSE connection')
  //     return
  //   }

  //   console.log('Setting up SSE connection...')

  //   const connectSSE = () => {
  //     // Close existing connection
  //     if (eventSourceRef.current) {
  //       console.log('Closing existing SSE connection')
  //       eventSourceRef.current.close()
  //     }

  //     console.log('Creating new EventSource connection to /api/submissions/events')
  //     const eventSource = new EventSource('/api/submissions/events', {
  //       // Note: EventSource doesn't support custom headers directly
  //       // We'll rely on cookie authentication
  //     })

  //     eventSource.onopen = (event) => {
  //       console.log('SSE connection opened:', event)
  //       setIsConnected(true)
  //     }

  //     eventSource.onmessage = (event) => {
  //       console.log('SSE message received:', event.data)
  //       try {
  //         const data = JSON.parse(event.data)
  //         console.log('Parsed SSE data:', data)

  //         if (data.type === 'submission_created') {
  //           console.log('New submission received, refetching data:', data.data)
  //           // Refetch submissions to update the checklist
  //           refetch()
  //         } else if (data.type === 'test_event') {
  //           console.log('Test SSE event received:', data.data)
  //         } else if (data.type === 'ping') {
  //           console.log('SSE ping received')
  //           // Keep-alive ping, no action needed
  //         } else if (data.type === 'connected') {
  //           console.log('SSE connection established successfully')
  //         }
  //       } catch (error) {
  //         console.error('Error parsing SSE message:', error)
  //       }
  //     }

  //     eventSource.onerror = (error) => {
  //       console.error('SSE error:', error)
  //       console.log('EventSource readyState:', eventSource.readyState)
  //       setIsConnected(false)

  //       // Attempt to reconnect after 5 seconds
  //       setTimeout(() => {
  //         console.log('Attempting SSE reconnection...')
  //         if (eventSource.readyState === EventSource.CLOSED) {
  //           connectSSE()
  //         }
  //       }, 5000)
  //     }

  //     eventSourceRef.current = eventSource
  //   }

  //   connectSSE()

  //   // Cleanup on unmount
  //   return () => {
  //     console.log('Cleaning up SSE connection')
  //     if (eventSourceRef.current) {
  //       eventSourceRef.current.close()
  //       eventSourceRef.current = null
  //     }
  //   }
  // }, [token, refetch])

  const getStatusIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (completed: boolean) => {
    return completed ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
        {t('common.complete')}
      </Badge>
    ) : (
      <Badge variant="destructive">{t('admin.pending')}</Badge>
    );
  };

  // Calculate completion status based on enabled forms only
  const allFormsComplete = useMemo(() => {
    if (availableForms.length === 0) return false;
    return availableForms.every(form => formStatus[form.key as keyof FormStatus]);
  }, [availableForms, formStatus]);

  const someFormsComplete = useMemo(() => {
    return availableForms.some(form => formStatus[form.key as keyof FormStatus]);
  }, [availableForms, formStatus]);

  if (isLoading || modulesLoading) {
    return (
      <Card className="bg-card text-card-foreground rounded-lg border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('safety.dailySafetyFormChecklist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('status.loadingFormStatus')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card text-card-foreground rounded-lg border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {t('safety.dailySafetyFormChecklist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('status.unableToLoadFormStatus')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`rounded-lg border ${
        allFormsComplete
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : someFormsComplete
          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      }`}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          {allFormsComplete ? (
            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
          ) : someFormsComplete ? (
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
          )}
          <span className="text-sm md:text-base leading-tight">
            {t('safety.dailySafetyForms')} - {new Date().toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {allFormsComplete ? (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium text-sm md:text-base">
              ✅ {t('safety.allFormsCompleted')}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium text-sm md:text-base">
              ⚠️ {t('safety.pendingFormsReminder')}
            </p>
          </div>
        )}

        <div className="space-y-2 md:space-y-3">
          {availableForms.length === 0 ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200 text-sm md:text-base">
                {t('safety.noFormsEnabled')}
              </p>
            </div>
          ) : (
            availableForms.map((form) => {
              const isCompleted = formStatus[form.key as keyof FormStatus];
              return (
                <div key={form.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border gap-3 sm:gap-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(isCompleted)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm md:text-base">{form.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{form.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {getStatusBadge(isCompleted)}
                    {!isCompleted && (
                      <Button asChild size="sm" className="text-xs px-3">
                        <Link href={form.href}>{t('common.complete')}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!allFormsComplete && (
          <div className="mt-3 md:mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
            <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('safety.reminder')}:</strong> {t('safety.dailyComplianceReminder')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
