"use client";

import { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { SubmissionsTable } from "@/components/SubmissionsTable";
import { useGetSubmissionsQuery } from "@/lib/features/submissions/submissionsApi";
import { useGetTimesheetsQuery } from "@/lib/features/timesheets/timesheetsApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, XCircle, Clock, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MySubmissionsPage() {
  const { t } = useTranslation('common');
  
  // Pagination states for submissions
  const [submissionsClientPagination, setSubmissionsClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [submissionsServerPagination, setSubmissionsServerPagination] = useState({
    page: 1,
    pageSize: 50
  });

  // Pagination states for timesheets
  const [timesheetsClientPagination, setTimesheetsClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [timesheetsServerPagination, setTimesheetsServerPagination] = useState({
    page: 1,
    pageSize: 50
  });

  const { data, isLoading, error, refetch, isFetching } = useGetSubmissionsQuery({ 
    authType: 'contractor',
    page: submissionsServerPagination.page,
    pageSize: submissionsServerPagination.pageSize
  });

  const { data: timesheetsData, isLoading: timesheetsLoading, error: timesheetsError, refetch: refetchTimesheets, isFetching: timesheetsFetching } = useGetTimesheetsQuery({ 
    authType: 'contractor',
    page: timesheetsServerPagination.page,
    pageSize: timesheetsServerPagination.pageSize
  });

  // Pagination logic for submissions
  const allSubmissions = data?.submissions || [];
  const submissionsServerPaginationInfo = data?.pagination;

  const submissionsStartIndex = (submissionsClientPagination.currentPage - 1) * submissionsClientPagination.pageSize;
  const submissionsEndIndex = submissionsStartIndex + submissionsClientPagination.pageSize;
  const paginatedSubmissions = allSubmissions.slice(submissionsStartIndex, submissionsEndIndex);
  
  const submissionsTotalClientPages = Math.ceil(allSubmissions.length / submissionsClientPagination.pageSize);
  const submissionsEstimatedTotalRecords = submissionsServerPaginationInfo?.total || allSubmissions.length;
  const submissionsEstimatedTotalPages = Math.ceil(submissionsEstimatedTotalRecords / submissionsClientPagination.pageSize);
  
  const submissionsPaginationInfo = {
    page: submissionsClientPagination.currentPage,
    pageSize: submissionsClientPagination.pageSize,
    total: submissionsEstimatedTotalRecords,
    totalPages: submissionsEstimatedTotalPages,
    hasNextPage: submissionsClientPagination.currentPage < submissionsTotalClientPages || (submissionsServerPaginationInfo?.hasNextPage || false),
    hasPreviousPage: submissionsClientPagination.currentPage > 1
  };

  // Pagination logic for timesheets
  const allTimesheets = timesheetsData?.timesheets || [];
  const timesheetsServerPaginationInfo = timesheetsData?.pagination;

  const timesheetsStartIndex = (timesheetsClientPagination.currentPage - 1) * timesheetsClientPagination.pageSize;
  const timesheetsEndIndex = timesheetsStartIndex + timesheetsClientPagination.pageSize;
  const paginatedTimesheets = allTimesheets.slice(timesheetsStartIndex, timesheetsEndIndex);
  
  const timesheetsTotalClientPages = Math.ceil(allTimesheets.length / timesheetsClientPagination.pageSize);
  const timesheetsEstimatedTotalRecords = timesheetsServerPaginationInfo?.total || allTimesheets.length;
  const timesheetsEstimatedTotalPages = Math.ceil(timesheetsEstimatedTotalRecords / timesheetsClientPagination.pageSize);
  
  const timesheetsPaginationInfo = {
    page: timesheetsClientPagination.currentPage,
    pageSize: timesheetsClientPagination.pageSize,
    total: timesheetsEstimatedTotalRecords,
    totalPages: timesheetsEstimatedTotalPages,
    hasNextPage: timesheetsClientPagination.currentPage < timesheetsTotalClientPages || (timesheetsServerPaginationInfo?.hasNextPage || false),
    hasPreviousPage: timesheetsClientPagination.currentPage > 1
  };

  // Submissions pagination handlers
  const handleSubmissionsPageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allSubmissions.length / submissionsClientPagination.pageSize);
    
    if (page <= totalClientPages) {
      setSubmissionsClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      const nextServerPage = submissionsServerPagination.page + 1;
      setSubmissionsServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setSubmissionsClientPagination({ currentPage: 1, pageSize: submissionsClientPagination.pageSize });
    }
  }, [allSubmissions.length, submissionsClientPagination.pageSize, submissionsServerPagination.page]);

  const handleSubmissionsPageSizeChange = useCallback((pageSize: number) => {
    setSubmissionsClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Timesheets pagination handlers
  const handleTimesheetsPageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allTimesheets.length / timesheetsClientPagination.pageSize);
    
    if (page <= totalClientPages) {
      setTimesheetsClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      const nextServerPage = timesheetsServerPagination.page + 1;
      setTimesheetsServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setTimesheetsClientPagination({ currentPage: 1, pageSize: timesheetsClientPagination.pageSize });
    }
  }, [allTimesheets.length, timesheetsClientPagination.pageSize, timesheetsServerPagination.page]);

  const handleTimesheetsPageSizeChange = useCallback((pageSize: number) => {
    setTimesheetsClientPagination({ currentPage: 1, pageSize });
  }, []);

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
                data={paginatedSubmissions} 
                isLoading={isLoading}
                isFetching={isFetching}
                onDelete={handleDelete}
                serverSide={true}
                pagination={submissionsPaginationInfo}
                onPageChange={handleSubmissionsPageChange}
                onPageSizeChange={handleSubmissionsPageSizeChange}
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
                        <>
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
                                {paginatedTimesheets?.map((timesheet: any) => (
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
                          
                          {/* Timesheets Pagination */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4 border-t">
                            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                              <span className="hidden sm:inline">
                                {t('admin.showing')} {((timesheetsPaginationInfo.page - 1) * timesheetsPaginationInfo.pageSize) + 1} {t('admin.to')}{" "}
                                {Math.min(timesheetsPaginationInfo.page * timesheetsPaginationInfo.pageSize, timesheetsPaginationInfo.total)} {t('admin.of')} {timesheetsPaginationInfo.total} timesheets
                              </span>
                              <span className="sm:hidden">{timesheetsPaginationInfo.total} {t('admin.total')}</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <div className="flex items-center gap-2 mr-4">
                                <span className="text-xs font-medium">Rows per page:</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8">
                                      {timesheetsPaginationInfo.pageSize}
                                      <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {[5, 10, 25, 50].map((pageSize) => (
                                      <DropdownMenuItem
                                        key={pageSize}
                                        onClick={() => handleTimesheetsPageSizeChange(pageSize)}
                                        className={timesheetsPaginationInfo.pageSize === pageSize ? "bg-accent" : ""}
                                      >
                                        {pageSize}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimesheetsPageChange(timesheetsPaginationInfo.page - 1)}
                                disabled={!timesheetsPaginationInfo.hasPreviousPage}
                                className="text-xs"
                              >
                                {t('common.previous')}
                              </Button>
                              <div className="text-xs text-muted-foreground px-2">
                                Page {timesheetsPaginationInfo.page} of {timesheetsPaginationInfo.totalPages}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimesheetsPageChange(timesheetsPaginationInfo.page + 1)}
                                disabled={!timesheetsPaginationInfo.hasNextPage}
                                className="text-xs"
                              >
                                {t('common.next')}
                              </Button>
                            </div>
                          </div>
                        </>
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
