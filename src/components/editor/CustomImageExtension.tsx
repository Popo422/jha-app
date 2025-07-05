import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageWithDelete } from './ImageWithDelete';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: { src: string; alt?: string; width?: string; height?: string }) => ReturnType;
    };
  }
}

export const CustomImageExtension = Node.create({
  name: 'customImage',
  group: 'inline',
  inline: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      textAlign: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageWithDelete);
  },

  addCommands() {
    return {
      setCustomImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});