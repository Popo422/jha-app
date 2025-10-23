"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderOpen, CheckSquare, FileText, Users, Building, ClipboardList } from "lucide-react";
import ProjectTasks from "@/components/admin/ProjectTasks";
import ProjectSnapshot from "@/components/admin/ProjectSnapshot";
import ProjectDocuments from "@/components/admin/ProjectDocuments";
import ProjectWorkmen from "@/components/admin/ProjectWorkmen";
import ProjectSubcontractors from "@/components/admin/ProjectSubcontractors";
import ProjectChangeOrders from "@/components/admin/ProjectChangeOrders";

export default function ProjectDetailsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState('snapshot');

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="snapshot" className="text-xs sm:text-sm flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Project Snapshot</span>
            <span className="sm:hidden">Snapshot</span>
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
          <TabsTrigger value="workmen" className="text-xs sm:text-sm flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Workmen</span>
            <span className="sm:hidden">Workmen</span>
          </TabsTrigger>
          <TabsTrigger value="subcontractors" className="text-xs sm:text-sm flex items-center gap-1">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Subcontractors</span>
            <span className="sm:hidden">Subs</span>
          </TabsTrigger>
          <TabsTrigger value="change-orders" className="text-xs sm:text-sm flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Change Orders</span>
            <span className="sm:hidden">Changes</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="snapshot" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectSnapshot projectId={projectId} />
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
        
        <TabsContent value="workmen" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectWorkmen projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="subcontractors" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectSubcontractors projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="change-orders" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectChangeOrders projectId={projectId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}