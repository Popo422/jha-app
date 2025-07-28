"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import '../../../styles/tiptap.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Plus, Edit, Save, ArrowLeft, RefreshCw, Trash2, Eye, Image as ImageIcon, Bold, Italic, Underline as UnderlineIcon, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Table as TableIcon, Type, User } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useEditor, EditorContent } from '@tiptap/react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetToolboxTalksQuery, useCreateToolboxTalkMutation, useUpdateToolboxTalkMutation, useDeleteToolboxTalkMutation, useGetReadEntriesQuery, type ToolboxTalk, type PaginationInfo, type ToolboxTalkReadEntry } from '@/lib/features/toolbox-talks/toolboxTalksApi';
import { useToolboxTalkExportAll } from '@/hooks/useExportAll';
import StarterKit from '@tiptap/starter-kit';
import { ImageResize } from 'tiptap-extension-resize-image';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-extension-font-size';
import { CustomImageExtension } from '@/components/editor/CustomImageExtension';

type ViewMode = 'list' | 'add' | 'edit';
export default function ToolboxTalksPage() {
  const { t } = useTranslation('common');
  const { toast, showToast, hideToast } = useToast();
  const { admin } = useSelector((state: RootState) => state.auth);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null);
  
  // Readers modal state
  const [showReadersModal, setShowReadersModal] = useState(false);
  const [selectedTalkForReaders, setSelectedTalkForReaders] = useState<ToolboxTalk | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft" as 'draft' | 'published',
    authorName: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });

  // RTK Query hooks
  const { data: toolboxTalksData, isLoading, isFetching, refetch } = useGetToolboxTalksQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize
  });
  
  const [createToolboxTalk, { isLoading: isCreating }] = useCreateToolboxTalkMutation();
  const [updateToolboxTalk, { isLoading: isUpdating }] = useUpdateToolboxTalkMutation();
  const [deleteToolboxTalk] = useDeleteToolboxTalkMutation();
  const exportAllToolboxTalks = useToolboxTalkExportAll();
  
  // Read entries query for specific toolbox talk
  const { data: readEntriesData, isLoading: readEntriesLoading } = useGetReadEntriesQuery({
    companyId: admin?.companyId || '',
    toolboxTalkId: selectedTalkForReaders?.id || '',
    page: 1,
    pageSize: 100,
  }, {
    skip: !admin?.companyId || !selectedTalkForReaders?.id
  });

  // Function to fetch all toolbox talks for export
  const handleExportAll = useCallback(async () => {
    return await exportAllToolboxTalks({});
  }, [exportAllToolboxTalks]);

  const allToolboxTalks = toolboxTalksData?.toolboxTalks || [];
  const serverPaginationInfo = toolboxTalksData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allToolboxTalks.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allToolboxTalks.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allToolboxTalks.length;
  const estimatedTotalPages = Math.ceil(estimatedTotalRecords / clientPagination.pageSize);
  
  const paginationInfo = {
    page: clientPagination.currentPage,
    pageSize: clientPagination.pageSize,
    total: estimatedTotalRecords,
    totalPages: estimatedTotalPages,
    hasNextPage: clientPagination.currentPage < totalClientPages || (serverPaginationInfo?.hasNextPage || false),
    hasPreviousPage: clientPagination.currentPage > 1
  };

  // Check if we need to prefetch next batch
  const shouldPrefetch = clientPagination.currentPage >= totalClientPages - 2 && serverPaginationInfo?.hasNextPage;

  const handlePageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allToolboxTalks.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allToolboxTalks.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetToolboxTalksQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize
  }, {
    skip: !shouldPrefetch
  });

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Underline,
      Superscript,
      Subscript,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize.configure({
        types: ['textStyle'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ImageResize.configure({
        inline: true,
        allowBase64: false,
      }),
      CustomImageExtension
    ],
    content: formData.content,
    onUpdate: ({ editor }) => {
      setFormData(prev => ({
        ...prev,
        content: editor.getHTML()
      }));
    },
  });

  // Data is now loaded via RTK Query

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Clean up all pending image URLs
      pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
    };
  }, [pendingImages]);

  const handleAdd = () => {
    const newFormData = {
      title: "",
      content: "",
      status: "draft" as const,
      authorName: admin?.name || "",
    };
    setFormData(newFormData);
    setFormErrors({});
    setEditingTalk(null);
    // Clear any pending images and revoke their URLs
    pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
    setPendingImages(new Map());
    editor?.commands.setContent("");
    setViewMode('add');
  };

  const handleEdit = (talk: ToolboxTalk) => {
    setEditingTalk(talk);
    const editFormData = {
      title: talk.title,
      content: talk.content,
      status: talk.status,
      authorName: talk.authorName,
    };
    setFormData(editFormData);
    setFormErrors({});
    // Clear any pending images and revoke their URLs
    pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
    setPendingImages(new Map());
    editor?.commands.setContent(talk.content);
    setViewMode('edit');
  };


  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    if (!formData.content.trim() || formData.content === '<p></p>') {
      errors.content = "Content is required";
    }
    if (!formData.authorName.trim()) errors.authorName = "Author name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Debug function to log HTML content
  const logContent = () => {
    console.log('Current editor HTML:', editor?.getHTML());
    console.log('Form data content:', formData.content);
  };

  const uploadPendingImages = async (content: string): Promise<string> => {
    let updatedContent = content;
    
    for (const [tempUrl, file] of pendingImages.entries()) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const response = await fetch('/api/admin/toolbox-talks/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          // Replace all occurrences of temporary URL with actual uploaded URL
          updatedContent = updatedContent.replaceAll(tempUrl, data.url);
          // Clean up the temporary blob URL after replacement
          URL.revokeObjectURL(tempUrl);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to upload image: ${file.name} - ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        // Don't replace the temp URL if upload failed - leave the blob URL intact
        showToast(`Failed to upload image: ${file.name}`, "error");
      }
    }
    
    return updatedContent;
  };

  // Helper function to extract image URLs from HTML content
  const extractImageUrls = (htmlContent: string): string[] => {
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const urls: string[] = [];
    let match;
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const url = match[1];
      // Only include blob URLs (uploaded images)
      if (url.includes('blob.vercel-storage.com')) {
        urls.push(url);
      }
    }
    return urls;
  };

  // Helper function to delete unused images
  const deleteUnusedImages = async (oldUrls: string[], newUrls: string[]) => {
    const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));
    
    for (const url of urlsToDelete) {
      try {
        await fetch('/api/admin/toolbox-talks/delete-image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        console.log('Deleted unused image:', url);
      } catch (error) {
        console.error('Failed to delete image:', url, error);
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Get old image URLs if editing
      const oldImageUrls = editingTalk ? extractImageUrls(editingTalk.content) : [];

      // Get the latest HTML from the editor (this ensures we have the most current state)
      const editorContent = editor?.getHTML() || formData.content;
      console.log('Saving content:', editorContent);

      // Upload any pending images and get updated content with real URLs
      let finalContent = editorContent;
      if (pendingImages.size > 0) {
        finalContent = await uploadPendingImages(editorContent);
      }

      // Get new image URLs after processing
      const newImageUrls = extractImageUrls(finalContent);

      const saveData = {
        title: formData.title,
        content: finalContent,
        status: formData.status,
        authorName: formData.authorName
      };

      console.log('Final content being saved:', finalContent);

      if (editingTalk) {
        await updateToolboxTalk({
          id: editingTalk.id,
          ...saveData
        }).unwrap();
      } else {
        await createToolboxTalk(saveData).unwrap();
      }

      showToast(`${t('nav.toolboxTalks')} ${editingTalk ? t('admin.updating') : t('admin.creating')} successfully`, "success");
      
      // Delete unused images from blob storage if editing
      if (editingTalk && oldImageUrls.length > 0) {
        await deleteUnusedImages(oldImageUrls, newImageUrls);
      }

      // Clear pending images only after successful save
      setPendingImages(new Map());
      setViewMode('list');
    } catch (error: any) {
      showToast(error.data?.error || error.message || "Failed to save toolbox talk", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Find the toolbox talk to get its images before deletion
      const talkToDelete = allToolboxTalks.find(talk => talk.id === id);
      const imageUrls = talkToDelete ? extractImageUrls(talkToDelete.content) : [];

      await deleteToolboxTalk(id).unwrap();

      // Delete all associated images from blob storage
      if (imageUrls.length > 0) {
        await deleteUnusedImages(imageUrls, []);
      }

      showToast("Toolbox talk deleted successfully", "success");
    } catch (error: any) {
      showToast(error.data?.error || "Failed to delete toolbox talk", "error");
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.", "error");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      showToast("File too large. Maximum size is 5MB.", "error");
      return;
    }

    // Create temporary blob URL for preview with better error handling
    const tempUrl = URL.createObjectURL(file);
    const imageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the file for later upload
    setPendingImages(prev => new Map(prev).set(tempUrl, file));
    
    console.log('Created temp URL:', tempUrl, 'for file:', file.name);
    
    // Insert image into editor with temporary URL - ImageResize will handle the resizing
    // Clear any selection first, then insert at cursor position to avoid replacing content
    if (editor?.state.selection.empty) {
      // No selection, safe to insert
      editor?.chain().focus().insertContent(`<img src="${tempUrl}" alt="${file.name}" style="display: inline-block; margin: 0 5px;" />`).run();
    } else {
      // There's a selection, move cursor to end of selection before inserting
      if (!editor){
        return
      }
      const { to } = editor.state.selection;
      editor?.chain().focus().setTextSelection(to).insertContent(`<img src="${tempUrl}" alt="${file.name}" style="display: inline-block; margin: 0 5px;" />`).run();
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  // Define columns for the data table
  const columns = [
    {
      accessorKey: 'title',
      header: t('toolbox.title')
    },
    {
      accessorKey: 'status',
      header: t('tableHeaders.status'),
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === 'published' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      )
    },
    {
      accessorKey: 'authorName',
      header: t('toolbox.author')
    },
    {
      accessorKey: 'publishedAt',
      header: t('toolbox.published'),
      cell: ({ row }: any) => 
        row.original.publishedAt 
          ? new Date(row.original.publishedAt).toLocaleDateString()
          : t('status.unknown')
    },
    {
      accessorKey: 'createdAt',
      header: t('admin.created'),
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString()
    },
    {
      id: 'readers',
      header: 'Readers',
      cell: ({ row }: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTalkForReaders(row.original);
            setShowReadersModal(true);
          }}
          className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/20"
        >
          <User className="h-4 w-4" />
          View Readers
        </Button>
      )
    }
  ];

  // Render readers modal
  const renderReadersModal = () => (
    <AlertDialog open={showReadersModal} onOpenChange={setShowReadersModal}>
      <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Readers: {selectedTalkForReaders?.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            People who have confirmed reading this toolbox talk
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          {readEntriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading readers...</span>
            </div>
          ) : readEntriesData?.readEntries && readEntriesData.readEntries.length > 0 ? (
            <div className="space-y-4">
              {/* Statistics */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">Reading Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{readEntriesData.readEntries.length}</div>
                    <div className="text-sm text-gray-600">Total Reads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(readEntriesData.readEntries.map(entry => entry.readBy)).size}
                    </div>
                    <div className="text-sm text-gray-600">Unique Readers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {readEntriesData.readEntries.length > 0 
                        ? new Date(Math.max(...readEntriesData.readEntries.map(entry => new Date(entry.createdAt).getTime()))).toLocaleDateString()
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-600">Latest Read</div>
                  </div>
                </div>
              </div>

              {/* Readers List */}
              <div className="space-y-3">
                <h4 className="font-semibold">Readers List</h4>
                <div className="grid gap-3">
                  {readEntriesData.readEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex-1">
                        <div className="font-medium">{entry.readBy}</div>
                        <div className="text-sm text-gray-500">
                          Read on {new Date(entry.dateRead).toLocaleDateString()} 
                          • Submitted {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {entry.signature && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newWindow = window.open('', '_blank', 'width=600,height=400');
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>Signature - ${entry.readBy}</title></head>
                                  <body style="margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; font-family: Arial, sans-serif;">
                                    <h3 style="margin-bottom: 20px;">Signature: ${entry.readBy}</h3>
                                    <img src="${entry.signature}" alt="Signature" style="max-width: 90%; max-height: 70%; border: 1px solid #ddd; background: white; border-radius: 4px;" />
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View Signature
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Readers Yet</h3>
              <p className="text-gray-500">No one has confirmed reading this toolbox talk yet.</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Render form view (add/edit)
  const renderFormView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={() => {
            // Clean up pending images when going back
            pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
            setPendingImages(new Map());
            setViewMode('list');
            setEditingTalk(null);
            setFormData({ title: '', content: '', status: 'draft', authorName: '' });
            setFormErrors({});
          }} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('common.back')}</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {viewMode === 'add' ? t('toolbox.addNewToolboxTalk') : t('toolbox.editToolboxTalk')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {viewMode === 'add' 
            ? t('toolbox.createNewToolboxTalk') 
            : t('toolbox.updateToolboxTalk')
          }
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('toolbox.basicInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">{t('toolbox.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('toolbox.enterTitle')}
              />
              {formErrors.title && <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>}
            </div>

            <div>
              <Label htmlFor="status">{t('tableHeaders.status')}</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">{t('toolbox.draft')}</option>
                <option value="published">{t('toolbox.published')}</option>
              </select>
            </div>

            <div>
              <Label htmlFor="authorName">{t('toolbox.author')}</Label>
              <Input
                id="authorName"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                placeholder={t('toolbox.enterAuthor')}
              />
              {formErrors.authorName && <p className="text-sm text-red-500 mt-1">{formErrors.authorName}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t('toolbox.content')}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {/* Text Formatting */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive('bold') ? 'bg-gray-200' : ''}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive('italic') ? 'bg-gray-200' : ''}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={editor?.isActive('underline') ? 'bg-gray-200' : ''}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                
                {/* Font Size */}
                <select
                  value={editor?.getAttributes('textStyle').fontSize || '16px'}
                  onChange={(e) => editor?.chain().focus().setFontSize(e.target.value).run()}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="12px">12px</option>
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                  <option value="20px">20px</option>
                  <option value="24px">24px</option>
                  <option value="32px">32px</option>
                  <option value="48px">48px</option>
                </select>
                
                {/* Font Family */}
                <select
                  value={editor?.getAttributes('textStyle').fontFamily || 'Arial'}
                  onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
                
                {/* Text Color */}
                <input
                  type="color"
                  value={editor?.getAttributes('textStyle').color || '#000000'}
                  onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                  className="w-8 h-8 rounded border"
                  title="Text Color"
                />
                
                {/* Highlight Color */}
                <input
                  type="color"
                  value={editor?.getAttributes('highlight').color || '#ffff00'}
                  onChange={(e) => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
                  className="w-8 h-8 rounded border"
                  title="Highlight Color"
                />
                
                {/* Text Alignment */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                  className={editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                  className={editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                  className={editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                  className={editor?.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
                
                {/* Headings */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
                >
                  H1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
                >
                  H2
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
                >
                  H3
                </Button>
                
                {/* Lists */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive('bulletList') ? 'bg-gray-200' : ''}
                >
                  • List
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive('orderedList') ? 'bg-gray-200' : ''}
                >
                  1. List
                </Button>
                
                {/* Debug button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logContent}
                  className="text-xs"
                >
                  {t('toolbox.debug')}
                </Button>
                
                {/* Superscript/Subscript */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                  className={editor?.isActive('superscript') ? 'bg-gray-200' : ''}
                >
                  <SuperscriptIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleSubscript().run()}
                  className={editor?.isActive('subscript') ? 'bg-gray-200' : ''}
                >
                  <SubscriptIcon className="h-4 w-4" />
                </Button>
                
                {/* Table */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                
                {/* Image */}
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 min-h-[300px] prose max-w-none">
              <EditorContent editor={editor} />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              <p><strong>{t('toolbox.imageTips')}:</strong> {t('toolbox.imageTipsDesc')}</p>
              <p><strong>{t('toolbox.tableTips')}:</strong> {t('toolbox.tableTipsDesc')}</p>
            </div>
            {formErrors.content && <p className="text-sm text-red-500 mt-2">{formErrors.content}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            // Clean up pending images when canceling
            pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
            setPendingImages(new Map());
            setViewMode('list');
            setFormData({ title: '', content: '', status: 'draft', authorName: '' });
          }}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isCreating || isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {(isCreating || isUpdating) ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );

  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <div className="p-4 md:p-6">
        {renderFormView()}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.toolboxTalks')}</h1>
          <p className="text-muted-foreground">{t('toolbox.manageToolboxTalks')}</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('toolbox.addToolboxTalk')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.toolboxTalks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={(talk) => handleEdit(talk)}
            onDelete={(id) => handleDelete(id)}
            getRowId={(talk) => talk.id}
            canDelete={() => true}
            exportFilename="toolbox_talks"
            exportHeaders={[t('toolbox.title'), t('tableHeaders.status'), t('toolbox.author'), t('toolbox.published'), t('admin.created'), 'Readers']}
            getExportData={(talk) => [
              talk.title || '',
              talk.status || '',
              talk.authorName || '',
              talk.publishedAt ? new Date(talk.publishedAt).toLocaleDateString() : '',
              new Date(talk.createdAt).toLocaleDateString(),
              'View in app'
            ]}
            serverSide={true}
            pagination={paginationInfo}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onExportAll={handleExportAll}
          />
        </CardContent>
      </Card>

      {/* Readers Modal */}
      {renderReadersModal()}
      
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}