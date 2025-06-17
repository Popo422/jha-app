import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './features/theme/themeSlice'
import sidebarReducer from './features/sidebar/sidebarSlice'
import authReducer from './features/auth/authSlice'
import { submissionsApi } from './features/submissions/submissionsApi'
import { timesheetsApi } from './features/timesheets/timesheetsApi'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    sidebar: sidebarReducer,
    auth: authReducer,
    [submissionsApi.reducerPath]: submissionsApi.reducer,
    [timesheetsApi.reducerPath]: timesheetsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(submissionsApi.middleware, timesheetsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch