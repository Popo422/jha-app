"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  FileText, 
  Upload, 
  X,
  Eye,
  Trash2,
  Calendar,
  User,
  FolderOpen,
  FileImage,
  File,
  MoreVertical,
  Plus,
  Edit,
  Check,
  X as XIcon
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast, Toast } from "@/components/ui/toast";
import {
  useGetProjectDocumentsQuery,
  useCreateProjectDocumentMutation,
  useDeleteProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
  useUploadProjectDocumentMutation,
  useBulkUploadProjectDocumentsMutation,
  type ProjectDocument
} from '@/lib/features/project-documents/projectDocumentsApi';


interface ProjectDocumentsProps {
  projectId: string;
}

const DOCUMENT_CATEGORIES = [
  'All Categories',
  'Contracts',
  'Safety Reports',
  'Permits',
  'Drawings',
  'Specifications',
  'Progress Reports',
  'Invoices',
  'Other'
];


export default function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { t } = useTranslation('common');
  const { toast, showToast, hideToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState({
    search: '',
    category: 'All Categories'
  });
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10
  });
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [editingDocument, setEditingDocument] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  
  const { admin } = useSelector((state: RootState) => state.auth);

  // API hooks
  const { 
    data: documentsResponse, 
    isLoading, 
    error 
  } = useGetProjectDocumentsQuery({
    projectId,
    search: debouncedSearch || undefined,
    category: filters.category !== 'All Categories' ? filters.category : undefined,
    page: pagination.page,
    pageSize: pagination.pageSize
  });

  const [uploadDocument] = useUploadProjectDocumentMutation();
  const [bulkUploadDocuments] = useBulkUploadProjectDocumentsMutation();
  const [createDocument] = useCreateProjectDocumentMutation();
  const [deleteDocument] = useDeleteProjectDocumentMutation();
  const [updateDocument] = useUpdateProjectDocumentMutation();

  const documents = documentsResponse?.documents || [];
  const paginationInfo = documentsResponse?.pagination;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle single file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFiles(prev => [...prev, file.name]);

    try {
      const uploadResult = await uploadDocument({
        file,
        projectId,
        category: 'Other',
        description: ''
      }).unwrap();

      const createResult = await createDocument({
        projectId,
        name: uploadResult.fileData.name,
        description: uploadResult.fileData.description,
        category: uploadResult.fileData.category,
        fileType: uploadResult.fileData.fileType,
        fileSize: uploadResult.fileData.fileSize,
        url: uploadResult.fileData.url,
        blobKey: uploadResult.fileData.blobKey
      }).unwrap();

      showToast(`${file.name} uploaded successfully`, 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(`Failed to upload ${file.name}`, 'error');
    } finally {
      setUploadingFiles(prev => prev.filter(name => name !== file.name));
    }
  };

  // Handle bulk file upload
  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const fileNames = fileArray.map(f => f.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);

    try {
      const uploadResult = await bulkUploadDocuments({
        files: fileArray,
        projectId,
        category: 'Other',
        description: ''
      }).unwrap();

      // Create database records for each uploaded file
      const createPromises = uploadResult.uploadedFiles.map(fileData =>
        createDocument({
          projectId,
          name: fileData.name,
          description: fileData.description,
          category: fileData.category,
          fileType: fileData.fileType,
          fileSize: fileData.fileSize,
          url: fileData.url,
          blobKey: fileData.blobKey
        }).unwrap()
      );

      await Promise.all(createPromises);

      showToast(`${uploadResult.summary.successful} files uploaded successfully`, 'success');

      if (uploadResult.errors && uploadResult.errors.length > 0) {
        showToast(`Some files failed: ${uploadResult.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast("Failed to upload files", 'error');
    } finally {
      setUploadingFiles(prev => prev.filter(name => !fileNames.includes(name)));
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (document: ProjectDocument) => {
    try {
      await deleteDocument(document.id).unwrap();
      showToast(`${document.name} deleted successfully`, 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast(`Failed to delete ${document.name}`, 'error');
    }
  };

  // Handle edit functionality
  const handleEditDocument = (document: ProjectDocument) => {
    setEditingDocument(document.id);
    setEditForm({ name: document.name, description: document.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    try {
      await updateDocument({
        id: editingDocument,
        name: editForm.name,
        description: editForm.description
      }).unwrap();

      setEditingDocument(null);
      setEditForm({ name: '', description: '' });
      showToast('Document updated successfully', 'success');
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update document', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditForm({ name: '', description: '' });
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <FileImage className="h-5 w-5 text-green-500" />;
      case 'dwg':
        return <File className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'All Categories'
    });
    setPagination({ page: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.search || filters.category !== 'All Categories';

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleBulkUploadClick = () => {
    bulkFileInputRef.current?.click();
  };

  const exportToCSV = () => {
    if (!documents.length) return;
    
    const csvData = documents.map(doc => [
      doc.name,
      doc.category,
      doc.uploadedByName,
      formatDate(doc.createdAt),
      formatFileSize(doc.fileSize)
    ]);

    const csvContent = [
      ['Document Name', 'Category', 'Uploaded By', 'Upload Date', 'File Size'],
      ...csvData
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `project_documents_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end bg-gray-50 dark:bg-gray-800 rounded-lg py-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-60" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Project Documents</h3>
          <Badge variant="outline">{paginationInfo?.total || 0} documents</Badge>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            multiple={false}
          />
          <input
            ref={bulkFileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleBulkUpload(e.target.files)}
            multiple={true}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleUpload}>
                <Plus className="mr-2 h-4 w-4" />
                Single File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkUploadClick}>
                <Upload className="mr-2 h-4 w-4" />
                Multiple Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            disabled={!documents.length}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-end bg-gray-50 dark:bg-gray-800 rounded-lg py-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Search Documents</div>
          <Input
            placeholder="Search by name or uploader..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-60 text-xs"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Category</div>
          <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {hasActiveFilters && (
          <div className="space-y-1">
            <div className="text-xs font-medium">&nbsp;</div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {uploadingFiles.map((fileName) => (
          <div key={fileName} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Uploading...</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">{fileName}</div>
              </div>
            </div>
          </div>
        ))}
        
        {documents.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500">
            No documents found
          </div>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    {getFileIcon(document.fileType)}
                  </div>
                </div>
                
                <div className="flex-1">
                  {editingDocument === document.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Document Name</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description..."
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="h-7 px-2 text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 px-2 text-xs">
                          <XIcon className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Document Name</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{document.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatFileSize(document.fileSize)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Description</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {document.description || <span className="italic text-gray-400">No description</span>}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Category</div>
                        <Badge variant="secondary" className="text-xs">
                          {document.category}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Uploaded By</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {document.uploadedByName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(document.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        // Smart view: view in browser if supported, download if not
                        if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt', 'csv'].includes(document.fileType)) {
                          window.open(document.url, '_blank');
                        } else {
                          // For files that can't be viewed (like .dwg, .docx), download instead
                          const link = window.document.createElement('a');
                          link.href = document.url;
                          link.download = document.name;
                          link.click();
                        }
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditDocument(document)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600" 
                        onClick={() => handleDeleteDocument(document)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {paginationInfo && paginationInfo.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!paginationInfo.hasPreviousPage}
          >
            Previous
          </Button>
          
          {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === pagination.page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              className={pageNum === pagination.page ? "bg-blue-600 text-white" : ""}
            >
              {pageNum}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!paginationInfo.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}
      </div>
    </>
  );
}