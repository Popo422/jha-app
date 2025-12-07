"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  Shield,
  AlertTriangle,
  Users,
} from "lucide-react";
import RecentIncidentsTab from "@/components/admin/workers-comp/RecentIncidentsTab";
import QuickIncidentReportsTab from "@/components/admin/workers-comp/QuickIncidentReportsTab";
import IncidentReportsTab from "@/components/admin/workers-comp/IncidentReportsTab";
import { useGetWorkersCompDataQuery } from "@/lib/features/workers-comp/workersCompApi";

interface ProjectWorkersCompProps {
  projectId: string;
}

export default function ProjectWorkersComp({ projectId }: ProjectWorkersCompProps) {
  const [activeTab, setActiveTab] = useState('recent');
  
  // Use project-specific workers comp data
  const { data: workersCompData, isLoading, error } = useGetWorkersCompDataQuery({ projectId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workers Compensation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Project-specific workers comp and incident tracking
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Recent Incidents</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : workersCompData?.metrics.recentIncidents ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Needs Attention</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : workersCompData?.metrics.needsAttention ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-yellow-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Near Misses</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : workersCompData?.metrics.nearMisses ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-green-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>TRIR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : workersCompData?.metrics.trir ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Tabs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Project Incidents & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recent" className="text-xs">Recent Incidents</TabsTrigger>
              <TabsTrigger value="quick-reports" className="text-xs">Quick Reports</TabsTrigger>
              <TabsTrigger value="incident-reports" className="text-xs">Incident Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="mt-4">
              <RecentIncidentsTab projectId={projectId} />
            </TabsContent>
            
            <TabsContent value="quick-reports" className="mt-4">
              <QuickIncidentReportsTab projectId={projectId} />
            </TabsContent>
            
            <TabsContent value="incident-reports" className="mt-4">
              <IncidentReportsTab projectId={projectId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}