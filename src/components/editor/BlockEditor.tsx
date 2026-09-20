"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { Page } from '@/types';
import { useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Loader2 } from 'lucide-react';

export default function BlockEditor({ page }: { page: Page }) {
  const { user } = useAuth();
  const { currentUserRole } = useWorkspace();
  const { uploadFile, isUploading } = useFileUpload();
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Failed" | "">("Saved");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // A very basic translation of our Block[] to TipTap HTML (in a real scenario, we'd use a custom extension or JSON format)
  // For this MVP, we'll store the content as HTML to leverage TipTap easily, while maintaining our DB schema conceptually.
  const initialContent = page.blocks.map(b => {
    if (b.type === 'heading_1') return `<h1>${b.content}</h1>`;
    if (b.type === 'heading_2') return `<h2>${b.content}</h2>`;
    return `<p>${b.content}</p>`;
  }).join('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing or press "/" for commands...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        allowBase64: true, // We allow base64 temporarily while uploading
        HTMLAttributes: {
          class: 'rounded-lg max-w-full shadow-md my-4 transition-opacity',
        },
      }),
    ],
    content: initialContent,
    editable: currentUserRole === 'HOST',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] prose-h1:text-4xl prose-h1:font-semibold prose-h1:tracking-tight prose-h1:mb-6 prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-slate-200 prose-img:m-0 prose-img:mx-auto',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true; // Stop default behavior
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true; // Stop default behavior
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (currentUserRole !== 'HOST') return;
      setSaveStatus("Saving...");
      // Debounce the save (simple implementation inline)
      const timeoutId = setTimeout(() => {
        saveContent(editor.getHTML());
      }, 1000);
      return () => clearTimeout(timeoutId);
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!editor || currentUserRole !== 'HOST') return;

    // We can show a temporary local preview while it uploads
    const tempUrl = URL.createObjectURL(file);
    
    // Insert the image at the current cursor position with a fading class
    editor.chain().focus().setImage({ src: tempUrl }).run();

    // Upload to Firebase
    const { url, error } = await uploadFile(file, page.id);
    
    if (url && !error) {
      // Find the image node we just inserted and update its URL
      // TipTap doesn't have an easy "update specific node" without knowing the position
      // For MVP, we simply replace the exact matching src URL in the entire document
      const currentContent = editor.getHTML();
      const updatedContent = currentContent.replace(tempUrl, url);
      
      // Save it back without triggering re-render jumps
      editor.commands.setContent(updatedContent, false);
      saveContent(updatedContent);
    } else {
      console.error("Upload failed", error);
      // If it fails, remove the temp image
      const currentContent = editor.getHTML();
      const updatedContent = currentContent.replace(`<img src="${tempUrl}">`, "");
      editor.commands.setContent(updatedContent, false);
      alert("Failed to upload image. Max size is 5MB.");
    }
    
    URL.revokeObjectURL(tempUrl);
  };

  const saveContent = async (html: string) => {
    if (!user || currentUserRole !== 'HOST') return;
    
    // In a real robust implementation, we would parse HTML back to Block[]
    // For MVP, we'll just save a single block with the raw HTML to keep things moving.
    try {
      await updateDoc(doc(db, "pages", page.id), {
        blocks: [
          {
            id: page.blocks[0]?.id || crypto.randomUUID(),
            type: 'paragraph', // We abuse this slightly to store the whole HTML for now
            content: html
          }
        ],
        updatedAt: serverTimestamp(),
        lastEditedBy: user.uid,
      });
      setSaveStatus("Saved");
    } catch (error) {
      console.error("Error saving page:", error);
      setSaveStatus("Failed");
    }
  };

  useEffect(() => {
    // Sync external changes (if another user edits, or we switch pages)
    if (editor && editor.getHTML() !== initialContent && saveStatus !== "Saving...") {
      // editor.commands.setContent(initialContent);
    }
  }, [page.id, editor]);

  useEffect(() => {
    const handleAiProcess = async () => {
      if (!editor || currentUserRole !== 'HOST' || isAiProcessing) return;

      const html = editor.getHTML();
      // Simple regex to find the first image src
      const match = html.match(/<img[^>]+src="([^">]+)"/);
      
      if (!match || !match[1]) {
        alert("Please upload at least one image first to process with AI.");
        return;
      }

      setIsAiProcessing(true);
      setSaveStatus("AI Processing...");

      try {
        const res = await fetch('/api/ai/process-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: match[1] })
        });
        
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        // Strip markdown backticks if Gemini accidentally wrapped the HTML
        let cleanHtml = data.result.replace(/```html/g, '').replace(/```/g, '').trim();

        // Insert the AI result at the end of the document
        editor.chain().focus().insertContent(`<hr><div class="ai-generated">${cleanHtml}</div>`).run();
        saveContent(editor.getHTML());
      } catch (err: any) {
        console.error("AI processing failed", err);
        alert(`AI processing failed: ${err.message}`);
        setSaveStatus("Failed");
      } finally {
        setIsAiProcessing(false);
      }
    };

    window.addEventListener('ai-process-page', handleAiProcess);
    return () => window.removeEventListener('ai-process-page', handleAiProcess);
  }, [editor, currentUserRole, isAiProcessing]);

  return (
    <div className="relative">
      {/* Save Status Indicator */}
      {currentUserRole === 'HOST' && (
        <div className="absolute -top-10 right-0 text-xs font-medium text-slate-500 flex items-center">
          {(isUploading || isAiProcessing) && <Loader2 size={12} className="animate-spin mr-1" />}
          {saveStatus}
        </div>
      )}
      
      <EditorContent editor={editor} />
    </div>
  );
}
