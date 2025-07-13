'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, User, Eye, RefreshCw } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ImageResize } from 'tiptap-extension-resize-image'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import FontFamily from '@tiptap/extension-font-family'
import FontSize from 'tiptap-extension-font-size'
import '@/styles/tiptap.css'

type ToolboxTalk = {
  id: string;
  title: string;
  content: string; // HTML content
  status: 'draft' | 'published';
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ToolboxTalksPage() {
  const { t } = useTranslation('common');
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalk | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read-only TipTap editor for displaying content
  const contentEditor = useEditor({
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
      })
    ],
    content: selectedTalk?.content || '',
    editable: false, // Read-only
  });

  // Update editor content when selectedTalk changes
  useEffect(() => {
    if (contentEditor && selectedTalk) {
      contentEditor.commands.setContent(selectedTalk.content);
    }
  }, [selectedTalk, contentEditor]);

  // Load published toolbox talks
  const loadToolboxTalks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/toolbox-talks');
      if (response.ok) {
        const data = await response.json();
        setToolboxTalks(data.toolboxTalks);
      } else {
        throw new Error(t('status.loadingToolboxTalks'));
      }
    } catch (error) {
      setError(t('pages.loadingSubmissions'));
      console.error('Error loading toolbox talks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadToolboxTalks();
  }, []);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return t('status.today');
    if (diffInDays === 1) return `1 ${t('status.dayAgo')}`;
    if (diffInDays < 7) return `${diffInDays} ${t('status.daysAgo')}`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {selectedTalk ? (
            // Individual talk view
            <div>
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => setSelectedTalk(null)}>
                  ← {t('pages.backToAllTalks')}
                </Button>
              </div>
              
              <article className="max-w-4xl mx-auto">
                <header className="mb-8 text-center">
                  <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    {selectedTalk.title}
                  </h1>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{selectedTalk.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>{selectedTalk.publishedAt ? formatDate(selectedTalk.publishedAt) : t('admin.pending')}</span>
                    </div>
                    <Badge variant="default">{t('admin.approved')}</Badge>
                  </div>
                </header>

                <div className="readonly-editor">
                  <EditorContent editor={contentEditor} />
                </div>
              </article>
            </div>
          ) : (
            // List view
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">{t('nav.toolboxTalks')}</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('pages.toolboxTalksDescription')}
                  </p>
                </div>
                <Button variant="outline" onClick={loadToolboxTalks} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </Button>
              </div>

              {error && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-600">{error}</p>
                  </CardContent>
                </Card>
              )}

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">{t('status.loadingToolboxTalks')}</p>
                </div>
              ) : toolboxTalks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                        📋
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('pages.noToolboxTalks')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md">
                        {t('pages.noToolboxTalksDescription')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {toolboxTalks.map((talk) => (
                    <Card key={talk.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTalk(talk)}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2 text-gray-900 dark:text-gray-100">
                              {talk.title}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{talk.authorName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{talk.publishedAt ? formatTimeAgo(talk.publishedAt) : t('status.justNow')}</span>
                              </div>
                              <Badge variant="default">{t('admin.approved')}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            {t('common.read')}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-gray-600 dark:text-gray-400">
                          {(() => {
                            // Strip HTML tags for preview
                            const textContent = talk.content.replace(/<[^>]*>/g, '');
                            const preview = textContent.trim();
                            return preview.length > 150 ? preview.substring(0, 150) + '...' : preview || t('pages.noToolboxTalksDescription');
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}