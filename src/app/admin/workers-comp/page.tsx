"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  FileText,
  Shield,
  AlertTriangle,
  Users,
  TrendingUp,
  Bell,
} from "lucide-react";
import RecentIncidentsTab from "@/components/admin/workers-comp/RecentIncidentsTab";
import QuickIncidentReportsTab from "@/components/admin/workers-comp/QuickIncidentReportsTab";
import IncidentReportsTab from "@/components/admin/workers-comp/IncidentReportsTab";
import { useGetWorkersCompDataQuery } from "@/lib/features/workers-comp/workersCompApi";

export default function WorkersCompPage() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('recent');
  const { data: workersCompData, isLoading, error } = useGetWorkersCompDataQuery();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('workersComp.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('workersComp.description')}
        </p>
      </div>

      {/* Top Section: Metrics and Action Required */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-6 lg:mb-8">
        {/* Metrics Cards */}
        <div className="w-full lg:w-1/2">
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1 md:gap-2">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="leading-tight">{t('workersComp.metrics.recentIncidents')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : workersCompData?.metrics.recentIncidents ?? 0}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1 md:gap-2">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="leading-tight">{t('workersComp.metrics.needsAttention')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : workersCompData?.metrics.needsAttention ?? 0}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1 md:gap-2">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="leading-tight">{t('workersComp.metrics.nearMisses')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : workersCompData?.metrics.nearMisses ?? 0}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1 md:gap-2">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="leading-tight">{t('workersComp.metrics.trir')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : workersCompData?.metrics.trir ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Required Sidebar */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 md:p-6">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">{t('workersComp.actionRequired.title')}</h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{t('workersComp.actionRequired.asOf')} 07 Dec 2023</p>
            </div>
            <div className="space-y-3 md:space-y-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">{t('workersComp.actionRequired.loadingActionItems')}</div>
              ) : (
                workersCompData?.actionItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/50">
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs md:text-sm text-gray-900 dark:text-gray-100 mb-1 leading-tight">{item.title}</h4>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                )) ?? <div className="text-xs md:text-sm text-muted-foreground">{t('workersComp.actionRequired.noActionItems')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent" className="text-xs sm:text-sm">
            <span className="sm:hidden">{t('workersComp.tabs.recent')}</span>
            <span className="hidden sm:inline">{t('workersComp.tabs.recentIncidents')}</span>
          </TabsTrigger>
          <TabsTrigger value="quick-incidents" className="text-xs sm:text-sm">
            <span className="sm:hidden">{t('workersComp.tabs.quickReports')}</span>
            <span className="hidden sm:inline">{t('workersComp.tabs.quickIncidentReports')}</span>
          </TabsTrigger>
          <TabsTrigger value="full-incidents" className="text-xs sm:text-sm">
            <span className="sm:hidden">{t('workersComp.tabs.fullReports')}</span>
            <span className="hidden sm:inline">{t('workersComp.tabs.incidentReports')}</span>
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