"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Eye, ExternalLink, FileIcon, Play, Pause, Download } from "lucide-react";

interface AttachmentPreviewProps {
  file: File | { name: string; url: string; filename?: string };
  onDelete?: () => void;
  showDeleteButton?: boolean;
  className?: string;
  isDeleting?: boolean;
}

export default function AttachmentPreview({ 
  file, 
  onDelete, 
  showDeleteButton = true,
  className = "",
  isDeleting = false
}: AttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Determine if this is a File object or a URL object
  const isFileObject = file instanceof File;
  const fileName = isFileObject ? file.name : (file.filename || file.name);
  const fileUrl = isFileObject ? URL.createObjectURL(file) : file.url;
  
  // Get file extension
  const getFileExtension = (name: string) => {
    return name.split('.').pop()?.toLowerCase() || '';
  };
  
  // Determine file type
  const getFileType = (name: string) => {
    const ext = getFileExtension(name);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return 'image';
    }
    
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      return 'video';
    }
    
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
      return 'audio';
    }
    
    return 'other';
  };
  
  const fileType = getFileType(fileName);
  
  const handlePreview = () => {
    if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
      // For media files, open in new tab
      window.open(fileUrl, '_blank');
    } else {
      // For non-media files, trigger download
      handleDownload();
    }
  };
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAudioPlay = (audio: HTMLAudioElement) => {
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
    
    audio.onended = () => setIsPlaying(false);
  };
  
  const renderPreview = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="relative group w-16 h-16">
            <img 
              src={fileUrl} 
              alt={fileName}
              className="w-full h-full object-cover rounded border"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="text-white hover:text-gray-200 hover:bg-white/10 p-1"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case 'video':
        return (
          <div className="relative group w-16 h-16">
            <video 
              src={fileUrl}
              className="w-full h-full object-cover rounded border"
              muted
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="text-white hover:text-gray-200 hover:bg-white/10 p-1"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded border">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
              🎵
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <audio 
                controls 
                className="w-full mt-1"
                style={{ height: '32px' }}
              >
                <source src={fileUrl} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="relative group">
            <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded border cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={handleDownload}>
              <FileIcon className="h-8 w-8 text-gray-500" />
              <span className="text-sm truncate flex-1">{fileName}</span>
              <Download className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className={`relative ${className} ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {renderPreview()}
      
      {isDeleting && (
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 mr-2">
          {fileName}
        </span>
        
        <div className="flex items-center space-x-1">
          {(fileType === 'image' || fileType === 'video' || fileType === 'audio') ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          ) : fileType === 'other' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-6 w-6 p-0 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Download file"
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
          
          {showDeleteButton && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              title={isDeleting ? "Deleting..." : "Remove file"}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}