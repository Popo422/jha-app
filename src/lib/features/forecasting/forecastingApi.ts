import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ForecastingData {
  dailySpendData: { date: string; cost: number }[]
  projectAnalytics: { name: string; cost: number }[]
  companyAnalytics: { name: string; cost: number }[]
  summary: {
    totalCost: number
    averageDailyCost: number
    totalDays: number
    recentTrendPercentage: number
    dataRange: {
      startDate: string
      endDate: string
    }
  }
}

export interface ForecastSettings {
  forecastDays: number
  confidenceLevel: number
  seasonalAdjustment: boolean
  trendSmoothing: boolean
}

export interface BudgetSettings {
  projectBudgets: { [projectName: string]: number }
  alertThresholds: {
    warningPercent: number
    criticalPercent: number
  }
}

export interface GetForecastingDataParams {
  startDate: string
  endDate: string
  projectNames?: string[]
}

export interface SaveForecastSettingsParams {
  forecastSettings?: Partial<ForecastSettings>
  budgetSettings?: Partial<BudgetSettings>
  projectBudgets?: { [projectName: string]: number }
}

export const forecastingApi = createApi({
  reducerPath: 'forecastingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/forecasting',
    prepareHeaders: (headers) => {
      // Get admin token from cookie
      if (typeof window !== 'undefined') {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        if (token) {
          headers.set('Authorization', `AdminBearer ${token}`)
        }
      }
      return headers
    },
  }),
  tagTypes: ['ForecastingData', 'ForecastSettings'],
  endpoints: (builder) => ({
    getForecastingData: builder.query<ForecastingData, GetForecastingDataParams>({
      query: ({ startDate, endDate, projectNames }) => {
        const params = new URLSearchParams({
          startDate,
          endDate,
        })
        
        if (projectNames && projectNames.length > 0) {
          params.append('projectNames', projectNames.join(','))
        }
        
        return `?${params}`
      },
      providesTags: ['ForecastingData'],
    }),
    saveForecastSettings: builder.mutation<any, SaveForecastSettingsParams>({
      query: (settings) => ({
        url: '',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['ForecastSettings'],
    }),
  }),
})

export const {
  useGetForecastingDataQuery,
  useLazyGetForecastingDataQuery,
  useSaveForecastSettingsMutation,
} = forecastingApi