"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Page } from '@/types';
import { useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function BlockEditor({ page }: { page: Page }) {
  const { user } = useAuth();
  const { currentUserRole } = useWorkspace();
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Failed" | "">("Saved");

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
    ],
    content: initialContent,
    editable: currentUserRole === 'HOST',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] prose-h1:text-4xl prose-h1:font-semibold prose-h1:tracking-tight prose-h1:mb-6 prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-slate-200',
      },
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

  return (
    <div className="relative">
      {/* Save Status Indicator */}
      {currentUserRole === 'HOST' && (
        <div className="absolute -top-10 right-0 text-xs font-medium text-slate-500">
          {saveStatus}
        </div>
      )}
      
      <EditorContent editor={editor} />
    </div>
  );
}
