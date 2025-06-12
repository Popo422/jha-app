import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './features/theme/themeSlice'
import sidebarReducer from './features/sidebar/sidebarSlice'
import authReducer from './features/auth/authSlice'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    sidebar: sidebarReducer,
    auth: authReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch