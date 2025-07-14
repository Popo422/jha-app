"use client";

import { useTranslation } from 'react-i18next';
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { SubmissionsTable } from "@/components/SubmissionsTable";
import { useGetSubmissionsQuery } from "@/lib/features/submissions/submissionsApi";
import { useGetTimesheetsQuery } from "@/lib/features/timesheets/timesheetsApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function MySubmissionsPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, error, refetch } = useGetSubmissionsQuery({ authType: 'contractor' });
  const { data: timesheetsData, isLoading: timesheetsLoading, error: timesheetsError, refetch: refetchTimesheets } = useGetTimesheetsQuery({ authType: 'contractor' });

  const handleDelete = (id: string) => {
    refetch();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />{t('admin.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('admin.rejected')}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t('admin.pending')}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />

      <main className="p-2 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">{t('pages.mySubmissions')}</h1>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">{t('pages.safetyFormSubmissions')}</h2>
          </div>

          {error ? (
            <div className="bg-card text-card-foreground rounded-lg border p-6">
              <p className="text-destructive">{t('pages.loadingSubmissions')}</p>
            </div>
          ) : (
            <>
              <SubmissionsTable 
                data={data?.submissions || []} 
                isLoading={isLoading} 
                onDelete={handleDelete}
              />
              
              {/* Timesheets Section */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">{t('pages.myTimesheets')}</h2>
                {timesheetsError ? (
                  <div className="bg-card text-card-foreground rounded-lg border p-6">
                    <p className="text-destructive">{t('pages.loadingSubmissions')}</p>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('pages.timesheetSubmissions')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timesheetsLoading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t('common.loading')}...
                        </div>
                      ) : timesheetsData?.timesheets?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t('pages.noTimesheetsFound')}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm">{t('tableHeaders.date')}</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm">{t('tableHeaders.projectName')}</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm">{t('tableHeaders.hours')}</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm">{t('tableHeaders.status')}</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm">{t('tableHeaders.details')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timesheetsData?.timesheets?.map((timesheet: any) => (
                                <tr key={timesheet.id} className="border-b hover:bg-muted/50 transition-colors">
                                  <td className="p-4 align-middle">
                                    <div className="text-sm font-medium">{format(new Date(timesheet.date), "MMM dd, yyyy")}</div>
                                  </td>
                                  <td className="p-4 align-middle">
                                    <div className="text-sm">{timesheet.projectName}</div>
                                  </td>
                                  <td className="p-4 align-middle">
                                    <div className="text-sm font-medium">{timesheet.timeSpent} hrs</div>
                                  </td>
                                  <td className="p-4 align-middle">
                                    {getStatusBadge(timesheet.status)}
                                  </td>
                                  <td className="p-4 align-middle">
                                    {timesheet.status === 'rejected' && timesheet.rejectionReason && (
                                      <div className="text-xs text-red-600 dark:text-red-400 max-w-xs">
                                        <span className="font-medium">{t('admin.rejectionReasonLabel')}</span> {timesheet.rejectionReason}
                                      </div>
                                    )}
                                    {timesheet.status !== 'pending' && timesheet.approvedByName && (
                                      <div className="text-xs text-muted-foreground">
                                        {timesheet.status === 'approved' ? t('admin.approved') : t('admin.rejected')} {t('admin.by')} {timesheet.approvedByName}
                                        {timesheet.approvedAt && (
                                          <div>{format(new Date(timesheet.approvedAt), "MMM dd, yyyy h:mm a")}</div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
