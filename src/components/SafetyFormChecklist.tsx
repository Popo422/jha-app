"use client";

import { useEffect, useState, useRef } from "react";
import { useGetSubmissionsQuery } from "@/lib/features/submissions/submissionsApi";
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
  const [formStatus, setFormStatus] = useState<FormStatus>({
    startOfDay: false,
    endOfDay: false,
    jha: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const token = useSelector((state: RootState) => state.auth.token);

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
        Complete
      </Badge>
    ) : (
      <Badge variant="destructive">Pending</Badge>
    );
  };

  const allFormsComplete = formStatus.startOfDay && formStatus.endOfDay && formStatus.jha;
  const someFormsComplete = formStatus.startOfDay || formStatus.endOfDay || formStatus.jha;

  if (isLoading) {
    return (
      <Card className="bg-card text-card-foreground rounded-lg border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Safety Form Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading form status...</p>
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
            Daily Safety Form Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load form status. Please try again.</p>
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
            Daily Safety Forms - {new Date().toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {allFormsComplete ? (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium text-sm md:text-base">
              ✅ All safety forms completed for today. Great job staying compliant!
            </p>
          </div>
        ) : (
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium text-sm md:text-base">
              ⚠️ Please complete the pending safety forms below to ensure workplace compliance.
            </p>
          </div>
        )}

        <div className="space-y-2 md:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border gap-3 sm:gap-2">
            <div className="flex items-center gap-3">
              {getStatusIcon(formStatus.startOfDay)}
              <div className="flex-1">
                <h4 className="font-medium text-sm md:text-base">Start of Day Report</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Daily health and safety check-in</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {getStatusBadge(formStatus.startOfDay)}
              {!formStatus.startOfDay && (
                <Button asChild size="sm" className="text-xs px-3">
                  <Link href="/contractor-forms/start-of-day-report">Complete</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border gap-3 sm:gap-2">
            <div className="flex items-center gap-3">
              {getStatusIcon(formStatus.jha)}
              <div className="flex-1">
                <h4 className="font-medium text-sm md:text-base">Job Hazard Analysis (JHA)</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Risk assessment for daily tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {getStatusBadge(formStatus.jha)}
              {!formStatus.jha && (
                <Button asChild size="sm" className="text-xs px-3">
                  <Link href="/contractor-forms/job-hazard-analysis">Complete</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border gap-3 sm:gap-2">
            <div className="flex items-center gap-3">
              {getStatusIcon(formStatus.endOfDay)}
              <div className="flex-1">
                <h4 className="font-medium text-sm md:text-base">End of Day Report</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Daily completion and health check-out</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {getStatusBadge(formStatus.endOfDay)}
              {!formStatus.endOfDay && (
                <Button asChild size="sm" className="text-xs px-3">
                  <Link href="/contractor-forms/end-of-day-report">Complete</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {!allFormsComplete && (
          <div className="mt-3 md:mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
            <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
              <strong>Reminder:</strong> All safety forms must be completed daily to ensure workplace safety compliance
              and regulatory requirements.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
