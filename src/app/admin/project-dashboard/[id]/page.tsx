"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderOpen, CheckSquare, FileText, Users, Building } from "lucide-react";
import ProjectTasks from "@/components/admin/ProjectTasks";
import ProjectSnapshot from "@/components/admin/ProjectSnapshot";

export default function ProjectDetailsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const projectName = searchParams.get('name') || '';
  const [activeTab, setActiveTab] = useState('snapshot');

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
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
        <TabsList className="grid w-full grid-cols-5">
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
        </TabsList>
        
        <TabsContent value="snapshot" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            {projectName ? (
              <ProjectSnapshot 
                projectId={projectId} 
                projectName={projectName} 
              />
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4">Project Snapshot</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Project name not provided in URL parameters.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <ProjectTasks projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Documents</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Project documents content will be implemented here.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="workmen" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Workmen</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Project workmen content will be implemented here.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="subcontractors" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Subcontractors</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Project subcontractors content will be implemented here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}