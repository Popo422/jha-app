"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Area,
  AreaChart,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Target,
  Settings
} from "lucide-react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import {
  generateCostForecast,
  generateForecastSummary,
  generateBudgetAnalysis,
  calculateSeasonalFactors,
  type ForecastDataPoint,
  type ForecastSummary,
  type ProjectBudget
} from "@/lib/utils/forecasting";

interface CostForecastingProps {
  dailySpendData: { date: string; cost: number }[];
  projectAnalytics: { name: string; hours: number; cost: number }[];
  isLoading: boolean;
  isFetching: boolean;
}

export function CostForecasting({ 
  dailySpendData, 
  projectAnalytics, 
  isLoading, 
  isFetching 
}: CostForecastingProps) {
  const { t } = useTranslation('common');
  const [forecastDays, setForecastDays] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [showSettings, setShowSettings] = useState(false);
  const [customBudgets, setCustomBudgets] = useState<{[key: string]: number}>({});

  // Generate forecast data
  const forecastData = useMemo(() => {
    if (!dailySpendData || dailySpendData.length < 3) return [];
    return generateCostForecast(dailySpendData, forecastDays, confidenceLevel);
  }, [dailySpendData, forecastDays, confidenceLevel]);

  // Generate forecast summary
  const forecastSummary = useMemo(() => {
    if (!dailySpendData || dailySpendData.length < 2) return null;
    return generateForecastSummary(dailySpendData, forecastData);
  }, [dailySpendData, forecastData]);

  // Generate budget analysis
  const budgetAnalysis = useMemo(() => {
    if (!projectAnalytics || projectAnalytics.length === 0) return [];
    
    // Create projected costs based on trend
    const projectForecasts: {[key: string]: number} = {};
    projectAnalytics.forEach(project => {
      projectForecasts[project.name] = project.cost * 1.15; // Simple 15% increase projection
    });

    return generateBudgetAnalysis(projectAnalytics, customBudgets, projectForecasts);
  }, [projectAnalytics, customBudgets]);

  // Calculate seasonal factors
  const seasonalFactors = useMemo(() => {
    if (!dailySpendData || dailySpendData.length < 24) return [];
    return calculateSeasonalFactors(dailySpendData);
  }, [dailySpendData]);

  // Prepare chart data with confidence intervals
  const chartDataWithConfidence = useMemo(() => {
    return forecastData.map(point => ({
      ...point,
      date: new Date(point.date).toLocaleDateString(),
      actualCost: point.actualCost || null,
      predictedCost: point.isForecast ? point.predictedCost : null,
      forecastCost: point.isForecast ? point.predictedCost : null,
      upperBound: point.confidenceUpper || null,
      lowerBound: point.confidenceLower || null
    }));
  }, [forecastData]);

  // Get risk level color
  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  // Budget analysis table columns
  const budgetColumns: ColumnDef<ProjectBudget>[] = useMemo(() => [
    {
      accessorKey: "projectName",
      header: t('admin.projectName'),
      cell: ({ row }) => <div className="font-medium">{row.getValue("projectName")}</div>,
    },
    {
      accessorKey: "budgetedCost",
      header: "Budget",
      cell: ({ row }) => <div>${(row.getValue("budgetedCost") as number).toFixed(2)}</div>,
    },
    {
      accessorKey: "actualCost",
      header: "Actual Cost",
      cell: ({ row }) => <div>${(row.getValue("actualCost") as number).toFixed(2)}</div>,
    },
    {
      accessorKey: "projectedCost",
      header: "Projected Cost",
      cell: ({ row }) => <div className="font-semibold">${(row.getValue("projectedCost") as number).toFixed(2)}</div>,
    },
    {
      accessorKey: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const variance = row.getValue("variance") as number;
        const isOver = variance > 0;
        return (
          <div className={`font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
            {isOver ? '+' : ''}${variance.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusConfig = {
          under_budget: { label: "Under Budget", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
          at_risk: { label: "At Risk", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
          over_budget: { label: "Over Budget", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Badge className={config.className}>{config.label}</Badge>;
      },
    },
  ], [t]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!forecastSummary || forecastData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Cost Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Insufficient data for cost forecasting. Need at least 3 days of cost data to generate predictions.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Projected Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">
              ${forecastSummary.projectedTotalCost.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">
              Based on {forecastDays}-day forecast
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Current Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              ${forecastSummary.currentBurnRate.toFixed(2)}/day
            </div>
            <div className="flex items-center mt-1">
              {getTrendIcon(forecastSummary.trend)}
              <span className="text-xs text-gray-500 ml-1 capitalize">
                {forecastSummary.trend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Badge className={getRiskColor(forecastSummary.riskLevel)}>
              {forecastSummary.riskLevel.toUpperCase()}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">
              Forecast Accuracy: {(forecastSummary.forecastAccuracy * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Forecast Settings
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? 'Hide' : 'Show'} Settings
            </Button>
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="forecastDays">Forecast Period (Days)</Label>
                <Input
                  id="forecastDays"
                  type="number"
                  min="7"
                  max="365"
                  value={forecastDays}
                  onChange={(e) => setForecastDays(parseInt(e.target.value) || 30)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confidenceLevel">Confidence Level</Label>
                <select
                  id="confidenceLevel"
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                >
                  <option value={0.90}>90%</option>
                  <option value={0.95}>95%</option>
                  <option value={0.99}>99%</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cost Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Forecast with Confidence Intervals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithConfidence} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'upperBound') return [`$${value?.toFixed(2)}`, 'Upper Bound'];
                    if (name === 'lowerBound') return [`$${value?.toFixed(2)}`, 'Lower Bound'];
                    if (name === 'actualCost') return [`$${value?.toFixed(2)}`, 'Actual Cost'];
                    if (name === 'predictedCost') return [`$${value?.toFixed(2)}`, 'Predicted Cost'];
                    return [`$${value?.toFixed(2)}`, name];
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                
                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stackId="confidence"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stackId="confidence"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  connectNulls={false}
                />
                
                {/* Actual cost line */}
                <Line
                  type="monotone"
                  dataKey="actualCost"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                  name="Actual Cost"
                />
                
                {/* Predicted cost line */}
                <Line
                  type="monotone"
                  dataKey="predictedCost"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                  name="Predicted Cost"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Actual Analysis */}
      {budgetAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminDataTable
              data={budgetAnalysis}
              columns={budgetColumns}
              isLoading={isLoading}
              isFetching={isFetching}
              getRowId={(budget) => budget.projectId}
              exportFilename="budget_analysis"
              exportHeaders={["Project", "Budget", "Actual", "Projected", "Variance", "Status"]}
              getExportData={(budget) => [
                budget.projectName,
                `$${budget.budgetedCost.toFixed(2)}`,
                `$${budget.actualCost.toFixed(2)}`,
                `$${budget.projectedCost.toFixed(2)}`,
                `$${budget.variance.toFixed(2)}`,
                budget.status.replace('_', ' ')
              ]}
              searchValue=""
              onSearchChange={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {/* Seasonal Analysis */}
      {seasonalFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Cost Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={seasonalFactors.map((factor, index) => ({
                    month: new Date(0, index).toLocaleString('default', { month: 'short' }),
                    factor: factor
                  }))}
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Seasonal Factor']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="factor" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Seasonal factors show cost variations by month. Values above 1.0 indicate higher-than-average costs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}