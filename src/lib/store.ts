import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './features/theme/themeSlice'
import sidebarReducer from './features/sidebar/sidebarSlice'
import authReducer from './features/auth/authSlice'
import membershipReducer from './features/membership/membershipSlice'
import { submissionsApi } from './features/submissions/submissionsApi'
import { timesheetsApi } from './features/timesheets/timesheetsApi'
import { authApi } from './features/auth/authApi'
import { contractorsApi } from './features/contractors/contractorsApi'
import { modulesApi } from './features/modules/modulesApi'
import { companyApi } from './features/company/companyApi'
import { reportingApi } from './features/reporting/reportingApi'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    sidebar: sidebarReducer,
    auth: authReducer,
    membership: membershipReducer,
    [submissionsApi.reducerPath]: submissionsApi.reducer,
    [timesheetsApi.reducerPath]: timesheetsApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [contractorsApi.reducerPath]: contractorsApi.reducer,
    [modulesApi.reducerPath]: modulesApi.reducer,
    [companyApi.reducerPath]: companyApi.reducer,
    [reportingApi.reducerPath]: reportingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      submissionsApi.middleware, 
      timesheetsApi.middleware,
      authApi.middleware,
      contractorsApi.middleware,
      modulesApi.middleware,
      companyApi.middleware,
      reportingApi.middleware
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch