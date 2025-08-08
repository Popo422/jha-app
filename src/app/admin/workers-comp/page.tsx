"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  FileText,
  Shield,
} from "lucide-react";
import RecentIncidentsTab from "@/components/admin/workers-comp/RecentIncidentsTab";
import QuickIncidentReportsTab from "@/components/admin/workers-comp/QuickIncidentReportsTab";
import IncidentReportsTab from "@/components/admin/workers-comp/IncidentReportsTab";

export default function WorkersCompPage() {
  const [activeTab, setActiveTab] = useState('recent');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Workers Compensation Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          Manage and track workplace incidents and safety reports
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Know the Risk</CardTitle>
            <Search className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">Stay vigilant.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report the Incident</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">See it. Report it.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Safety Training</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">A safer crew.</p>
          </CardContent>
        </Card>
      </div>

      {/* Incident Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent" className="text-xs sm:text-sm">
            <span className="sm:hidden">Recent</span>
            <span className="hidden sm:inline">Recent Incidents</span>
          </TabsTrigger>
          <TabsTrigger value="quick-incidents" className="text-xs sm:text-sm">
            <span className="sm:hidden">Quick Reports</span>
            <span className="hidden sm:inline">Quick Incident Reports</span>
          </TabsTrigger>
          <TabsTrigger value="full-incidents" className="text-xs sm:text-sm">
            <span className="sm:hidden">Full Reports</span>
            <span className="hidden sm:inline">Incident Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="mt-6">
          <RecentIncidentsTab />
        </TabsContent>
        
        <TabsContent value="quick-incidents" className="mt-6">
          <QuickIncidentReportsTab />
        </TabsContent>
        
        <TabsContent value="full-incidents" className="mt-6">
          <IncidentReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}