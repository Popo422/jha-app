"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart3
} from 'lucide-react';

interface HoursDataPoint {
  date: string;
  totalHours: number;
  uniqueEmployees: number;
  entriesCount: number;
  avgHoursPerEmployee: number;
}

interface HoursSummary {
  totalHours: number;
  avgDailyHours: number;
  peakDay: {
    date: string;
    hours: number;
    employees: number;
  };
  totalDays: number;
  totalUniqueEmployees: number;
}

interface HoursOverTimeResponse {
  hoursOverTime: HoursDataPoint[];
  summary: HoursSummary;
  period: string;
  daysBack: number;
  filters: {
    project: string | null;
    subcontractor: string | null;
  };
}

interface HoursOverTimeChartProps {
  companyId: string;
  projectFilter?: string;
  subcontractorFilter?: string;
  className?: string;
}

export default function HoursOverTimeChart({ 
  companyId, 
  projectFilter, 
  subcontractorFilter, 
  className = '' 
}: HoursOverTimeChartProps) {
  const [data, setData] = useState<HoursOverTimeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [daysBack, setDaysBack] = useState(30);

  // Fetch hours data
  const fetchHoursData = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        companyId,
        period,
        daysBack: daysBack.toString()
      });
      
      if (projectFilter) {
        params.append('project', projectFilter);
      }
      
      if (subcontractorFilter) {
        params.append('subcontractor', subcontractorFilter);
      }

      const response = await fetch(`/api/admin/project-snapshot/hours-over-time?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch hours data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching hours data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchHoursData();
  }, [companyId, projectFilter, subcontractorFilter, period, daysBack]);

  // Format chart data
  const chartData = data?.hoursOverTime.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString(),
  })) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Hours Worked Over Time
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={period === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('daily')}
            >
              Daily
            </Button>
            <Button
              variant={period === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </Button>
            <Button
              variant={period === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!data || chartData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hours data available for the selected filters and time period.
          </div>
        ) : (
          /* Hours Chart */
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'totalHours') return [`${value.toFixed(1)} hrs`, 'Total Hours'];
                    if (name === 'uniqueEmployees') return [`${value} people`, 'Employees'];
                    if (name === 'avgHoursPerEmployee') return [`${value.toFixed(1)} hrs`, 'Avg per Employee'];
                    return [value, name];
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                
                {/* Total Hours Area */}
                <Area
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Total Hours"
                />
                
                {/* Total Hours Line */}
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Total Hours"
                />

                {/* Employee Count Line */}
                <Line
                  type="monotone"
                  dataKey="uniqueEmployees"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  name="Employees"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Period Controls - Always visible */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {period} data for {data?.summary?.totalDays || 0} periods
            </span>
          </div>
          
          <div className="flex space-x-2">
            {[14, 30, 60, 90].map((days) => (
              <Button
                key={days}
                variant={daysBack === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaysBack(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}