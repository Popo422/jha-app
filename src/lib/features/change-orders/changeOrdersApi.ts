import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ChangeOrder {
  id: string
  projectId: string
  companyId: string
  title: string
  description?: string
  changeType: 'Scope' | 'Time' | 'Cost' | 'All'
  
  // Cost Impact
  originalContractAmount?: number
  newAmount?: number
  costDifference?: number
  
  // Schedule Impact
  addedDays: number
  originalEndDate?: string
  revisedEndDate?: string
  
  // Request Information
  requestedBy: string
  requestedByUserId?: string
  submissionDate: string
  notesOrJustification?: string
  
  // Admin Approval Section
  toBeApprovedBy?: string
  toBeApprovedByUserIds: string[]
  keyStakeholder?: string
  status: 'Pending' | 'Approved' | 'Rejected'
  assignedApproverId?: string
  assignedApproverName?: string
  
  // Approval Information
  approverSignature?: string
  dateApproved?: string
  dateRejected?: string
  rejectionReason?: string
  
  createdAt: string
  updatedAt: string
}

export interface ChangeOrderDocument {
  id: string
  changeOrderId: string
  projectId: string
  companyId: string
  name: string
  description?: string
  category: string
  fileType: string
  fileSize: number
  url: string
  blobKey: string
  uploadedBy: string
  uploadedByName: string
  createdAt: string
}

export interface CreateChangeOrderRequest {
  projectId: string
  title: string
  description?: string
  changeType: 'Scope' | 'Time' | 'Cost' | 'All'
  originalContractAmount?: number
  newAmount?: number
  costDifference?: number
  addedDays?: number
  originalEndDate?: string
  revisedEndDate?: string
  requestedBy: string
  notesOrJustification?: string
  toBeApprovedBy?: string
  toBeApprovedByUserIds?: string[]
  keyStakeholder?: string
}

export interface UpdateChangeOrderRequest {
  id: string
  title?: string
  description?: string
  changeType?: 'Scope' | 'Time' | 'Cost' | 'All'
  originalContractAmount?: number
  newAmount?: number
  costDifference?: number
  addedDays?: number
  originalEndDate?: string
  revisedEndDate?: string
  notesOrJustification?: string
  toBeApprovedBy?: string
  toBeApprovedByUserIds?: string[]
  keyStakeholder?: string
}

export interface ApprovalRequest {
  id: string
  status: 'Approved' | 'Rejected'
  approverSignature?: string
  rejectionReason?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ChangeOrdersResponse {
  changeOrders: ChangeOrder[]
  pagination: PaginationInfo
}

export interface ChangeOrderResponse {
  success: boolean
  changeOrder: ChangeOrder
}

export interface DeleteChangeOrderResponse {
  success: boolean
}

export interface ChangeOrderDocumentsResponse {
  documents: ChangeOrderDocument[]
  pagination: PaginationInfo
}

export interface ChangeOrderDocumentResponse {
  success: boolean
  document: ChangeOrderDocument
}

export interface UploadFileData {
  name: string
  description: string
  category: string
  fileType: string
  fileSize: number
  url: string
  blobKey: string
}

export interface UploadResponse {
  success: boolean
  fileData: UploadFileData
}


export interface ChangeOrdersQueryParams {
  projectId: string
  search?: string
  status?: string
  changeType?: string
  page?: number
  pageSize?: number
}

export interface ChangeOrderDocumentsQueryParams {
  changeOrderId: string
  search?: string
  category?: string
  page?: number
  pageSize?: number
}

export const changeOrdersApi = createApi({
  reducerPath: 'changeOrdersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/change-orders',
    credentials: 'include',
  }),
  tagTypes: ['ChangeOrder', 'ChangeOrderDocument'],
  endpoints: (builder) => ({
    // Get change orders with filtering and pagination
    getChangeOrders: builder.query<ChangeOrdersResponse, ChangeOrdersQueryParams>({
      query: ({ projectId, search, status, changeType, page = 1, pageSize = 10 }) => {
        const params = new URLSearchParams({
          projectId,
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        
        if (search) params.append('search', search)
        if (status) params.append('status', status)
        if (changeType) params.append('changeType', changeType)
        
        return `?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.changeOrders.map(({ id }) => ({ type: 'ChangeOrder' as const, id })),
              { type: 'ChangeOrder', id: 'LIST' },
            ]
          : [{ type: 'ChangeOrder', id: 'LIST' }],
    }),

    // Get single change order
    getChangeOrder: builder.query<{ changeOrder: ChangeOrder }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChangeOrder', id }],
    }),

    // Create change order
    createChangeOrder: builder.mutation<ChangeOrderResponse, CreateChangeOrderRequest>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChangeOrder', id: 'LIST' }],
    }),

    // Update change order
    updateChangeOrder: builder.mutation<ChangeOrderResponse, any>({
      query: (body) => ({
        url: '',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ChangeOrder', id },
        { type: 'ChangeOrder', id: 'LIST' },
      ],
    }),

    // Approve/Reject change order
    approveRejectChangeOrder: builder.mutation<ChangeOrderResponse, ApprovalRequest>({
      query: ({ id, ...body }) => ({
        url: `/${id}/approval`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ChangeOrder', id },
        { type: 'ChangeOrder', id: 'LIST' },
      ],
    }),

    // Delete change order
    deleteChangeOrder: builder.mutation<DeleteChangeOrderResponse, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ChangeOrder', id: 'LIST' }],
    }),

    // Upload document for change order
    uploadChangeOrderDocument: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
    }),


    // Get change order documents
    getChangeOrderDocuments: builder.query<ChangeOrderDocumentsResponse, ChangeOrderDocumentsQueryParams>({
      query: ({ changeOrderId, search, category, page = 1, pageSize = 10 }) => {
        const params = new URLSearchParams({
          changeOrderId,
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        
        if (search) params.append('search', search)
        if (category) params.append('category', category)
        
        return `/documents?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.documents.map(({ id }) => ({ type: 'ChangeOrderDocument' as const, id })),
              { type: 'ChangeOrderDocument', id: 'LIST' },
            ]
          : [{ type: 'ChangeOrderDocument', id: 'LIST' }],
    }),

    // Create change order document (after upload)
    createChangeOrderDocument: builder.mutation<ChangeOrderDocumentResponse, { changeOrderId: string; projectId: string } & UploadFileData>({
      query: (body) => ({
        url: '/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChangeOrderDocument', id: 'LIST' }],
    }),

    // Delete change order document
    deleteChangeOrderDocument: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ChangeOrderDocument', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetChangeOrdersQuery,
  useGetChangeOrderQuery,
  useCreateChangeOrderMutation,
  useUpdateChangeOrderMutation,
  useApproveRejectChangeOrderMutation,
  useDeleteChangeOrderMutation,
  useUploadChangeOrderDocumentMutation,
  useGetChangeOrderDocumentsQuery,
  useCreateChangeOrderDocumentMutation,
  useDeleteChangeOrderDocumentMutation,
} = changeOrdersApi