import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MembershipData, UserData } from '@/lib/membership-helper'

interface MembershipState {
  isLoading: boolean
  isVerified: boolean
  hasLevel3Access: boolean
  user: UserData | null
  memberships: MembershipData[]
  error: string | null
  lastChecked: number | null
}

const initialState: MembershipState = {
  isLoading: true,
  isVerified: false,
  hasLevel3Access: false,
  user: null,
  memberships: [],
  error: null,
  lastChecked: null
}

const membershipSlice = createSlice({
  name: 'membership',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null
      }
    },
    setMembershipData: (state, action: PayloadAction<{
      user: UserData | null
      memberships: MembershipData[]
      hasLevel3Access: boolean
    }>) => {
      state.isVerified = true
      state.hasLevel3Access = action.payload.hasLevel3Access
      state.user = action.payload.user
      state.memberships = action.payload.memberships
      state.lastChecked = Date.now()
      state.error = null
      state.isLoading = false
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isVerified = false
      state.hasLevel3Access = false
      state.user = null
      state.memberships = []
      state.isLoading = false
    },
    clearMembership: (state) => {
      state.isVerified = false
      state.hasLevel3Access = false
      state.user = null
      state.memberships = []
      state.error = null
      state.lastChecked = null
      state.isLoading = false
    },
    updateLastChecked: (state) => {
      state.lastChecked = Date.now()
    }
  }
})

export const {
  setLoading,
  setMembershipData,
  setError,
  clearMembership,
  updateLastChecked
} = membershipSlice.actions

export default membershipSlice.reducer