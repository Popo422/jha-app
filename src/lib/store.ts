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
import { projectsApi } from './features/projects/projectsApi'
import { subcontractorsApi } from './features/subcontractors/subcontractorsApi'
import { projectSnapshotApi } from './features/project-snapshot/projectSnapshotApi'
import { adminUsersApi } from './features/admin-users/adminUsersApi'
import { toolboxTalksApi } from './features/toolbox-talks/toolboxTalksApi'
import { forecastingApi } from './features/forecasting/forecastingApi'
import { projectManagersApi } from './features/project-managers/projectManagersApi'
import { incidentsApi } from './features/incidents/incidentsApi'
import { formTemplatesApi } from './features/form-templates/formTemplatesApi'
import { workersCompApi } from './features/workers-comp/workersCompApi'
import { contractorManagementApi } from './features/contractor-management/contractorManagementApi'
import { projectTasksApi } from './features/project-tasks/projectTasksApi'
import { projectDocumentsApi } from './features/project-documents/projectDocumentsApi'
import { changeOrdersApi } from './features/change-orders/changeOrdersApi'
import { expensesApi } from './features/expenses/expensesApi'
import { projectExpensesApi } from './features/project-expenses/projectExpensesApi'

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
    [projectsApi.reducerPath]: projectsApi.reducer,
    [subcontractorsApi.reducerPath]: subcontractorsApi.reducer,
    [projectSnapshotApi.reducerPath]: projectSnapshotApi.reducer,
    [adminUsersApi.reducerPath]: adminUsersApi.reducer,
    [toolboxTalksApi.reducerPath]: toolboxTalksApi.reducer,
    [forecastingApi.reducerPath]: forecastingApi.reducer,
    [projectManagersApi.reducerPath]: projectManagersApi.reducer,
    [incidentsApi.reducerPath]: incidentsApi.reducer,
    [formTemplatesApi.reducerPath]: formTemplatesApi.reducer,
    [workersCompApi.reducerPath]: workersCompApi.reducer,
    [contractorManagementApi.reducerPath]: contractorManagementApi.reducer,
    [projectTasksApi.reducerPath]: projectTasksApi.reducer,
    [projectDocumentsApi.reducerPath]: projectDocumentsApi.reducer,
    [changeOrdersApi.reducerPath]: changeOrdersApi.reducer,
    [expensesApi.reducerPath]: expensesApi.reducer,
    [projectExpensesApi.reducerPath]: projectExpensesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      submissionsApi.middleware, 
      timesheetsApi.middleware,
      authApi.middleware,
      contractorsApi.middleware,
      modulesApi.middleware,
      companyApi.middleware,
      reportingApi.middleware,
      projectsApi.middleware,
      subcontractorsApi.middleware,
      projectSnapshotApi.middleware,
      adminUsersApi.middleware,
      toolboxTalksApi.middleware,
      forecastingApi.middleware,
      projectManagersApi.middleware,
      incidentsApi.middleware,
      formTemplatesApi.middleware,
      workersCompApi.middleware,
      contractorManagementApi.middleware,
      projectTasksApi.middleware,
      projectDocumentsApi.middleware,
      changeOrdersApi.middleware,
      expensesApi.middleware,
      projectExpensesApi.middleware
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch