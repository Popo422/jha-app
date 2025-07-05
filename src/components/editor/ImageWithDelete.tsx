"use client";

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';

export const ImageWithDelete = ({ node, deleteNode }: NodeViewProps) => {
  const handleDelete = () => {
    deleteNode();
  };

  return (
    <NodeViewWrapper className="image-with-delete">
      <div className="relative inline-block group">
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt || ''} 
          className="max-w-full h-auto rounded"
          style={{ 
            width: node.attrs.width || 'auto', 
            height: node.attrs.height || 'auto'
          }}
        />
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-20"
          title="Delete image"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};