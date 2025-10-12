import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectDocument {
  id: string
  projectId: string
  name: string
  description?: string
  category: string
  fileType: string
  fileSize: number
  url: string
  blobKey: string
  companyId: string
  uploadedBy: string
  uploadedByName: string
  createdAt: string
}

export interface CreateProjectDocumentRequest {
  projectId: string
  name: string
  description?: string
  category: string
  fileType: string
  fileSize: number
  url: string
  blobKey: string
}

export interface UpdateProjectDocumentRequest {
  id: string
  name?: string
  description?: string
  category?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ProjectDocumentsResponse {
  documents: ProjectDocument[]
  pagination: PaginationInfo
}

export interface ProjectDocumentResponse {
  success: boolean
  document: ProjectDocument
}

export interface DeleteProjectDocumentResponse {
  success: boolean
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

export interface BulkUploadResponse {
  success: boolean
  uploadedFiles: UploadFileData[]
  errors?: string[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export interface ProjectDocumentsQueryParams {
  projectId: string
  search?: string
  category?: string
  page?: number
  pageSize?: number
}

export const projectDocumentsApi = createApi({
  reducerPath: 'projectDocumentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/project-documents',
    credentials: 'include',
  }),
  tagTypes: ['ProjectDocument'],
  endpoints: (builder) => ({
    // Get project documents with filtering and pagination
    getProjectDocuments: builder.query<ProjectDocumentsResponse, ProjectDocumentsQueryParams>({
      query: ({ projectId, search, category, page = 1, pageSize = 10 }) => {
        const params = new URLSearchParams({
          projectId,
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        
        if (search) params.append('search', search)
        if (category) params.append('category', category)
        
        return `?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.documents.map(({ id }) => ({ type: 'ProjectDocument' as const, id })),
              { type: 'ProjectDocument', id: 'LIST' },
            ]
          : [{ type: 'ProjectDocument', id: 'LIST' }],
    }),

    // Get single project document
    getProjectDocument: builder.query<{ document: ProjectDocument }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'ProjectDocument', id }],
    }),

    // Create project document
    createProjectDocument: builder.mutation<ProjectDocumentResponse, CreateProjectDocumentRequest>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ProjectDocument', id: 'LIST' }],
    }),

    // Update project document
    updateProjectDocument: builder.mutation<ProjectDocumentResponse, UpdateProjectDocumentRequest>({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ProjectDocument', id },
        { type: 'ProjectDocument', id: 'LIST' },
      ],
    }),

    // Delete project document
    deleteProjectDocument: builder.mutation<DeleteProjectDocumentResponse, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'ProjectDocument', id },
        { type: 'ProjectDocument', id: 'LIST' },
      ],
    }),

    // Upload single file
    uploadProjectDocument: builder.mutation<UploadResponse, {
      file: File
      projectId: string
      category?: string
      description?: string
    }>({
      query: ({ file, projectId, category, description }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)
        if (category) formData.append('category', category)
        if (description) formData.append('description', description)

        return {
          url: '/upload',
          method: 'POST',
          body: formData,
        }
      },
    }),

    // Bulk upload files
    bulkUploadProjectDocuments: builder.mutation<BulkUploadResponse, {
      files: File[]
      projectId: string
      category?: string
      description?: string
    }>({
      query: ({ files, projectId, category, description }) => {
        const formData = new FormData()
        files.forEach((file, index) => {
          formData.append(`files[${index}]`, file)
        })
        formData.append('projectId', projectId)
        if (category) formData.append('category', category)
        if (description) formData.append('description', description)

        return {
          url: '/upload',
          method: 'PUT',
          body: formData,
        }
      },
    }),
  }),
})

export const {
  useGetProjectDocumentsQuery,
  useGetProjectDocumentQuery,
  useCreateProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
  useDeleteProjectDocumentMutation,
  useUploadProjectDocumentMutation,
  useBulkUploadProjectDocumentsMutation,
} = projectDocumentsApi