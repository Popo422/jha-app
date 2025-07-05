"use client";

import { useState, useRef, useEffect } from "react";
import '../../../styles/tiptap.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Plus, Edit, Save, ArrowLeft, RefreshCw, Trash2, Eye, Image as ImageIcon, Bold, Italic, Underline as UnderlineIcon, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Table as TableIcon, Type } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { useEditor, EditorContent } from '@tiptap/react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
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
type ToolboxTalk = {
  id: string;
  title: string;
  content: string; // HTML content from WYSIWYG editor
  status: 'draft' | 'published';
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ToolboxTalksPage() {
  const { toast, showToast, hideToast } = useToast();
  const { admin } = useSelector((state: RootState) => state.auth);
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft" as 'draft' | 'published',
    authorName: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load toolbox talks
  const loadToolboxTalks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/toolbox-talks');
      if (response.ok) {
        const data = await response.json();
        setToolboxTalks(data.toolboxTalks);
      } else {
        throw new Error('Failed to load toolbox talks');
      }
    } catch (error) {
      showToast("Failed to load toolbox talks", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadToolboxTalks();
  }, []);

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

    setIsLoading(true);
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

      const url = '/api/admin/toolbox-talks';
      const method = editingTalk ? 'PUT' : 'POST';
      const body = editingTalk 
        ? { id: editingTalk.id, ...formData, content: finalContent }
        : { ...formData, content: finalContent };

      console.log('Final content being saved:', finalContent);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showToast(`Toolbox talk ${editingTalk ? 'updated' : 'created'} successfully`, "success");
        
        // Delete unused images from blob storage if editing
        if (editingTalk && oldImageUrls.length > 0) {
          await deleteUnusedImages(oldImageUrls, newImageUrls);
        }

        // Clear pending images only after successful save
        setPendingImages(new Map());
        setViewMode('list');
        loadToolboxTalks();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save toolbox talk');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save toolbox talk", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Find the toolbox talk to get its images before deletion
      const talkToDelete = toolboxTalks.find(talk => talk.id === id);
      const imageUrls = talkToDelete ? extractImageUrls(talkToDelete.content) : [];

      const response = await fetch('/api/admin/toolbox-talks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        // Delete all associated images from blob storage
        if (imageUrls.length > 0) {
          await deleteUnusedImages(imageUrls, []);
        }

        showToast("Toolbox talk deleted successfully", "success");
        loadToolboxTalks();
      } else {
        throw new Error('Failed to delete toolbox talk');
      }
    } catch (error) {
      showToast("Failed to delete toolbox talk", "error");
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
      header: 'Title'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === 'published' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      )
    },
    {
      accessorKey: 'authorName',
      header: 'Author'
    },
    {
      accessorKey: 'publishedAt',
      header: 'Published',
      cell: ({ row }: any) => 
        row.original.publishedAt 
          ? new Date(row.original.publishedAt).toLocaleDateString()
          : '-'
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString()
    }
  ];


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
            <span>Back</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {viewMode === 'add' ? 'Add New Toolbox Talk' : 'Edit Toolbox Talk'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {viewMode === 'add' 
            ? 'Create a new safety toolbox talk for your team' 
            : 'Update toolbox talk content and settings'
          }
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter toolbox talk title"
              />
              {formErrors.title && <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <Label htmlFor="authorName">Author</Label>
              <Input
                id="authorName"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                placeholder="Enter author name"
              />
              {formErrors.authorName && <p className="text-sm text-red-500 mt-1">{formErrors.authorName}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Content</CardTitle>
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
                  Debug
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
              <p><strong>Image tips:</strong> Hover over an image to see the delete button. Click and drag to move images. Use resize handles to adjust size.</p>
              <p><strong>Table tips:</strong> Click inside a table cell to edit. Right-click for table options.</p>
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save'}
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
          <h1 className="text-3xl font-bold">Toolbox Talks</h1>
          <p className="text-muted-foreground">Manage safety toolbox talks and training materials</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Toolbox Talk
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toolbox Talks</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={toolboxTalks}
            isLoading={isLoading}
            isFetching={false}
            onEdit={(talk) => handleEdit(talk)}
            onDelete={(id) => handleDelete(id)}
            getRowId={(talk) => talk.id}
            canDelete={() => true}
            exportFilename="toolbox_talks"
            exportHeaders={['Title', 'Status', 'Author', 'Published', 'Created']}
            getExportData={(talk) => [
              talk.title || '',
              talk.status || '',
              talk.authorName || '',
              talk.publishedAt ? new Date(talk.publishedAt).toLocaleDateString() : '',
              new Date(talk.createdAt).toLocaleDateString()
            ]}
          />
        </CardContent>
      </Card>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}