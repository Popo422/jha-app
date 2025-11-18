"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderOpen, CheckSquare, FileText, Users, ClipboardList, Calendar, Receipt, BarChart3, Shield } from "lucide-react";
import ProjectTasks from "@/components/admin/ProjectTasks";
import ProjectSnapshot from "@/components/admin/ProjectSnapshot";
import ProjectDocuments from "@/components/admin/ProjectDocuments";
import ProjectWorkmen from "@/components/admin/ProjectWorkmen";
import ProjectSubcontractors from "@/components/admin/ProjectSubcontractors";
import ProjectChangeOrders from "@/components/admin/ProjectChangeOrders";
import ProjectTimeline from "@/components/admin/ProjectTimeline";
import OverallProgress from "@/components/admin/OverallProgress";
import ProjectExpenses from "@/components/admin/ProjectExpenses";
import TimeAndCostReporting from "@/components/admin/TimeAndCostReporting";
import ProjectSafetyModule from "@/components/admin/ProjectSafetyModule";
import { useGetProjectTimelineQuery } from "@/lib/features/project-snapshot/projectSnapshotApi";

export default function ProjectDetailsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState('snapshot');

  // Fetch project timeline data
  const { data: timelineData, isLoading: isLoadingTimeline, isFetching: isFetchingTimeline } = useGetProjectTimelineQuery({
    projectId: projectId
  }, {
    skip: !projectId,
    refetchOnMountOrArgChange: true
  });

  // Function to handle tab changes and update URL
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search);
  }, [router]);

  // Set active tab from URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/project-dashboard')}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Project Details
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="snapshot" className="text-xs sm:text-sm flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Project Snapshot</span>
            <span className="sm:hidden">Snapshot</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
            <span className="sm:hidden">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="workforce" className="text-xs sm:text-sm flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Workforce</span>
            <span className="sm:hidden">Workforce</span>
          </TabsTrigger>
          <TabsTrigger value="change-orders" className="text-xs sm:text-sm flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Change Orders</span>
            <span className="sm:hidden">Changes</span>
          </TabsTrigger>
          <TabsTrigger value="time-cost" className="text-xs sm:text-sm flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Time & Cost</span>
            <span className="sm:hidden">T&C</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
            <span className="sm:hidden">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="safety" className="text-xs sm:text-sm flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Safety Module</span>
            <span className="sm:hidden">Safety</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="snapshot" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectSnapshot projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6">
          <div className="space-y-6">
            {/* Overall Progress - Top */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
              <OverallProgress
                progress={timelineData?.overallProgress || 0}
                startDate={timelineData?.projectStartDate || null}
                endDate={timelineData?.projectEndDate || null}
                totalTasks={timelineData?.totalTasks}
                isLoading={isLoadingTimeline || isFetchingTimeline}
              />
            </div>

            {/* Project Timeline - Full Width */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 min-h-[60vh]">
              <ProjectTimeline
                weeks={timelineData?.timelineData.weeks || []}
                taskTimelines={timelineData?.timelineData.taskTimelines || []}
                isLoading={isLoadingTimeline || isFetchingTimeline}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectTasks projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectDocuments projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="workforce" className="mt-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
              <ProjectWorkmen projectId={projectId} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
              <ProjectSubcontractors projectId={projectId} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="change-orders" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectChangeOrders projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="time-cost" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <TimeAndCostReporting projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectExpenses projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectSafetyModule projectId={projectId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}