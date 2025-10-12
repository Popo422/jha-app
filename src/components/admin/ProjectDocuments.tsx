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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  'Plans & Drawings',
  'Specifications',
  'Permits',
  'Safety Documents',
  'Reports',
  'Photos',
  'Contracts',
  'Other'
];


export default function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { t } = useTranslation('common');
  const { toast, showToast, hideToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '' });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalFiles, setModalFiles] = useState<File[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [fileCategories, setFileCategories] = useState<Record<string, string>>({});
  
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
    setEditForm({ 
      name: document.name, 
      description: document.description || '',
      category: document.category || 'Other'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    try {
      await updateDocument({
        id: editingDocument,
        name: editForm.name,
        description: editForm.description,
        category: editForm.category
      }).unwrap();

      setEditingDocument(null);
      setEditForm({ name: '', description: '', category: '' });
      showToast('Document updated successfully', 'success');
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update document', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditForm({ name: '', description: '', category: '' });
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleAddFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getAutoCategoryFromFile = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Image files
    if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) {
      return 'Photos';
    }
    
    // CAD/Drawing files - check filename patterns first for more specific categorization
    if (/\.(dwg|dxf|cad|step|stp|iges|igs)$/i.test(fileName) || /plan|drawing|blueprint|layout|elevation|section/i.test(fileName)) {
      return 'Plans & Drawings';
    }
    
    // Safety related files
    if (/safety|hazard|incident|accident|msds|sds|jha|job.hazard|risk.assessment/i.test(fileName)) {
      return 'Safety Documents';
    }
    
    // Contract/Legal documents
    if (/contract|agreement|legal|terms|conditions/i.test(fileName)) {
      return 'Contracts';
    }
    
    // Permit related files
    if (/permit|license|approval|authorization/i.test(fileName)) {
      return 'Permits';
    }
    
    // Specification files
    if (/spec|specification|standard|requirement|technical.spec/i.test(fileName)) {
      return 'Specifications';
    }
    
    // PDF documents and other reports (broader category)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || /report|summary|analysis|inspection|progress|status|update/i.test(fileName)) {
      return 'Reports';
    }
    
    // Default to Other for unrecognized files
    return 'Other';
  };

  const handleAddFiles = (files: File[]) => {
    setModalFiles(prev => [...prev, ...files]);
    // Initialize descriptions and auto-detect categories for new files
    files.forEach(file => {
      setFileDescriptions(prev => ({ ...prev, [file.name]: '' }));
      setFileCategories(prev => ({ ...prev, [file.name]: getAutoCategoryFromFile(file) }));
    });
  };

  const handleRemoveFile = (fileName: string) => {
    setModalFiles(prev => prev.filter(f => f.name !== fileName));
    setFileDescriptions(prev => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
    setFileCategories(prev => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleModalUpload = async () => {
    if (modalFiles.length === 0) return;

    const filesToUpload = modalFiles.map(file => ({
      file,
      description: fileDescriptions[file.name] || '',
      category: fileCategories[file.name] || 'Other'
    }));

    const fileNames = modalFiles.map(f => f.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);

    try {
      if (modalFiles.length === 1) {
        // Single file upload
        const fileData = filesToUpload[0];
        const uploadResult = await uploadDocument({
          file: fileData.file,
          projectId,
          category: fileData.category,
          description: fileData.description
        }).unwrap();

        await createDocument({
          projectId,
          name: uploadResult.fileData.name,
          description: uploadResult.fileData.description,
          category: uploadResult.fileData.category,
          fileType: uploadResult.fileData.fileType,
          fileSize: uploadResult.fileData.fileSize,
          url: uploadResult.fileData.url,
          blobKey: uploadResult.fileData.blobKey
        }).unwrap();

        showToast(`${fileData.file.name} uploaded successfully`, 'success');
      } else {
        // Bulk upload
        const uploadResult = await bulkUploadDocuments({
          files: modalFiles,
          projectId,
          category: 'Other', // Default, will be overridden by individual file categories
          description: ''
        }).unwrap();

        // Create database records for each uploaded file with individual metadata
        const createPromises = uploadResult.uploadedFiles.map((fileData: any, index: number) => {
          const originalFile = modalFiles[index];
          return createDocument({
            projectId,
            name: fileData.name,
            description: fileDescriptions[originalFile.name] || '',
            category: fileCategories[originalFile.name] || 'Other',
            fileType: fileData.fileType,
            fileSize: fileData.fileSize,
            url: fileData.url,
            blobKey: fileData.blobKey
          }).unwrap();
        });

        await Promise.all(createPromises);
        showToast(`${uploadResult.summary.successful} files uploaded successfully`, 'success');
      }

      // Reset modal state
      setModalFiles([]);
      setFileDescriptions({});
      setFileCategories({});
      setIsUploadModalOpen(false);

    } catch (error: any) {
      console.error('Upload error:', error);
      showToast(error?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploadingFiles(prev => prev.filter(name => !fileNames.includes(name)));
    }
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
          <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Files
          </Button>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Document Name</label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category</label>
                          <Select
                            value={editForm.category}
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_CATEGORIES.filter(cat => cat !== 'All Categories').map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description..."
                          className="text-sm mt-1"
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

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Project Documents
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-6 p-1">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">Support for multiple files, up to 50MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleAddFiles(Array.from(e.target.files))}
              />
            </div>

            {/* File List */}
            {modalFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Files to Upload ({modalFiles.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalFiles([]);
                      setFileDescriptions({});
                      setFileCategories({});
                    }}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {modalFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="border rounded-lg p-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getFileIcon(file.type.split('/')[1] || 'file')}
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveFile(file.name)}
                              className="flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Category
                              </label>
                              <Select
                                value={fileCategories[file.name] || 'Other'}
                                onValueChange={(value) => 
                                  setFileCategories(prev => ({ ...prev, [file.name]: value }))
                                }
                              >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DOCUMENT_CATEGORIES.filter(cat => cat !== 'All Categories').map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Description (optional)
                              </label>
                              <Input
                                value={fileDescriptions[file.name] || ''}
                                onChange={(e) => 
                                  setFileDescriptions(prev => ({ ...prev, [file.name]: e.target.value }))
                                }
                                placeholder="Add description..."
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUploadModalOpen(false);
                setModalFiles([]);
                setFileDescriptions({});
                setFileCategories({});
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleModalUpload}
              disabled={modalFiles.length === 0 || uploadingFiles.length > 0}
              className="flex items-center gap-2"
            >
              {uploadingFiles.length > 0 ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {modalFiles.length} file{modalFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}