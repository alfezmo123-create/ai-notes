"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, ChevronDown, Plus, Book, Folder, FileText, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function NotebookTree() {
  const { notebooks, loading, currentUserRole } = useWorkspace();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim() || !user) return;

    try {
      await addDoc(collection(db, "notebooks"), {
        workspaceId: user.uid,
        name: newNotebookName,
        order: notebooks.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewNotebookName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  if (loading) {
    return <div className="px-4 py-2 text-sm text-slate-500">Loading notebooks...</div>;
  }

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center justify-between px-3 pt-6 pb-2 group">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Notebooks
        </p>
        {currentUserRole === 'HOST' && (
          <button 
            onClick={() => setIsCreating(true)}
            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateNotebook} className="px-3 py-1">
          <input
            type="text"
            autoFocus
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            onBlur={() => setIsCreating(false)}
            placeholder="Notebook name..."
            className="w-full bg-slate-800 text-sm border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </form>
      )}

      {notebooks.length === 0 && !isCreating && (
        <div className="px-4 py-2 text-xs text-slate-500">
          No notebooks yet.
        </div>
      )}

      {notebooks.map((notebook) => (
        <NotebookNode key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
}

function NotebookNode({ notebook }: { notebook: any }) {
  const [expanded, setExpanded] = useState(false);
  const { sections, currentUserRole } = useWorkspace();
  const { user } = useAuth();
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const notebookSections = sections.filter((s) => s.notebookId === notebook.id);

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !user) return;

    try {
      await addDoc(collection(db, "sections"), {
        workspaceId: user.uid,
        notebookId: notebook.id,
        name: newSectionName,
        order: notebookSections.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewSectionName("");
      setIsCreatingSection(false);
      setExpanded(true);
    } catch (error) {
      console.error("Error creating section:", error);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="group flex items-center justify-between px-2 py-1.5 hover:bg-slate-800/50 rounded-lg mx-1 cursor-pointer">
        <div className="flex items-center flex-1 overflow-hidden" onClick={() => setExpanded(!expanded)}>
          <button className="p-0.5 text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Book size={14} className="mx-2 text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate">{notebook.name}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100">
          {currentUserRole === 'HOST' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsCreatingSection(true); setExpanded(true); }}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pl-6 flex flex-col space-y-0.5 mt-0.5">
          {notebookSections.map((section) => (
            <SectionNode key={section.id} section={section} />
          ))}
          
          {isCreatingSection && (
            <form onSubmit={handleCreateSection} className="pr-2 py-1">
              <input
                type="text"
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onBlur={() => setIsCreatingSection(false)}
                placeholder="Section name..."
                className="w-full bg-slate-800 text-sm border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </form>
          )}
          
          {notebookSections.length === 0 && !isCreatingSection && (
            <div className="pl-6 py-1 text-xs text-slate-500">Empty notebook</div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionNode({ section }: { section: any }) {
  const [expanded, setExpanded] = useState(false);
  const { pages, currentUserRole } = useWorkspace();
  const { user } = useAuth();
  const pathname = usePathname();
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  const sectionPages = pages.filter((p) => p.sectionId === section.id);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim() || !user) return;

    try {
      await addDoc(collection(db, "pages"), {
        workspaceId: user.uid,
        sectionId: section.id,
        title: newPageTitle,
        blocks: [
          {
            id: crypto.randomUUID(),
            type: 'heading_1',
            content: newPageTitle
          }
        ],
        version: 1,
        order: sectionPages.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastEditedBy: user.uid,
      });
      setNewPageTitle("");
      setIsCreatingPage(false);
      setExpanded(true);
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="group flex items-center justify-between py-1.5 hover:bg-slate-800/50 rounded-lg pr-2 cursor-pointer">
        <div className="flex items-center flex-1 overflow-hidden" onClick={() => setExpanded(!expanded)}>
          <button className="p-0.5 text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Folder size={14} className="mx-2 text-blue-400/70 flex-shrink-0" />
          <span className="text-sm text-slate-300 truncate">{section.name}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100">
          {currentUserRole === 'HOST' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsCreatingPage(true); setExpanded(true); }}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pl-6 flex flex-col space-y-0.5 mt-0.5">
          {sectionPages.map((page) => {
            const pageUrl = `/w/n/${section.notebookId}/s/${section.id}/p/${page.id}`;
            const isActive = pathname === pageUrl;
            return (
              <Link
                key={page.id}
                href={pageUrl}
                className={`group flex items-center py-1.5 pr-2 rounded-lg transition-colors ${
                  isActive ? "bg-blue-600/10 text-blue-400" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText size={14} className="mx-2 flex-shrink-0 opacity-70" />
                <span className="text-sm truncate">{page.title}</span>
              </Link>
            );
          })}
          
          {isCreatingPage && (
            <form onSubmit={handleCreatePage} className="pr-2 py-1">
              <input
                type="text"
                autoFocus
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onBlur={() => setIsCreatingPage(false)}
                placeholder="Page title..."
                className="w-full bg-slate-800 text-sm border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </form>
          )}

          {sectionPages.length === 0 && !isCreatingPage && (
            <div className="pl-6 py-1 text-xs text-slate-500">No pages</div>
          )}
        </div>
      )}
    </div>
  );
}
