"use client";

import { useState, useRef, useEffect } from "react";
import '../../../styles/tiptap.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Plus, Edit, Save, ArrowLeft, RefreshCw, Trash2, Eye, Image as ImageIcon } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ImageResize } from 'tiptap-extension-resize-image';

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
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft" as 'draft' | 'published',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResize.configure({
        inline: true,
        allowBase64: false,
      })
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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
          // Replace temporary URL with actual uploaded URL
          updatedContent = updatedContent.replace(tempUrl, data.url);
          // Clean up the temporary blob URL
          URL.revokeObjectURL(tempUrl);
        } else {
          throw new Error(`Failed to upload image: ${file.name}`);
        }
      } catch (error) {
        throw new Error(`Failed to upload image: ${file.name}`);
      }
    }
    
    return updatedContent;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Upload any pending images and get updated content with real URLs
      let finalContent = formData.content;
      if (pendingImages.size > 0) {
        finalContent = await uploadPendingImages(formData.content);
      }

      const url = '/api/admin/toolbox-talks';
      const method = editingTalk ? 'PUT' : 'POST';
      const body = editingTalk 
        ? { id: editingTalk.id, ...formData, content: finalContent }
        : { ...formData, content: finalContent };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showToast(`Toolbox talk ${editingTalk ? 'updated' : 'created'} successfully`, "success");
        // Clear pending images
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
      const response = await fetch('/api/admin/toolbox-talks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
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

    // Create temporary blob URL for preview
    const tempUrl = URL.createObjectURL(file);
    const imageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the file for later upload
    setPendingImages(prev => new Map(prev).set(tempUrl, file));
    
    // Insert image into editor with temporary URL
    editor?.chain().focus().setImage({ src: tempUrl, alt: file.name }).run();
    
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
            setFormData({ title: '', content: '', status: 'draft' });
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Content</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive('bold') ? 'bg-gray-200' : ''}
                >
                  Bold
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive('italic') ? 'bg-gray-200' : ''}
                >
                  Italic
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
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive('bulletList') ? 'bg-gray-200' : ''}
                >
                  List
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Image
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
            {formErrors.content && <p className="text-sm text-red-500 mt-2">{formErrors.content}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            // Clean up pending images when canceling
            pendingImages.forEach((_, tempUrl) => URL.revokeObjectURL(tempUrl));
            setPendingImages(new Map());
            setViewMode('list');
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