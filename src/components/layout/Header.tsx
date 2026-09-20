"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Share, Zap, Search } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user } = useAuth();
  const { notebooks, sections, pages } = useWorkspace();
  const pathname = usePathname();

  // Parse URL: /w/n/[notebookId]/s/[sectionId]/p/[pageId]
  const match = pathname.match(/\/w\/n\/([^\/]+)\/s\/([^\/]+)\/p\/([^\/]+)/);
  const notebookId = match ? match[1] : null;
  const sectionId = match ? match[2] : null;
  const pageId = match ? match[3] : null;

  const currentNotebook = notebooks.find(n => n.id === notebookId);
  const currentSection = sections.find(s => s.id === sectionId);
  const currentPage = pages.find(p => p.id === pageId);

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center text-sm text-slate-400">
        {currentNotebook ? (
          <>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">{currentNotebook.name}</span>
            <span className="mx-2">/</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">{currentSection?.name || "..."}</span>
            <span className="mx-2">/</span>
            <span className="text-slate-200 font-medium">{currentPage?.title || "..."}</span>
          </>
        ) : (
          <span className="text-slate-200 font-medium">Workspace</span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center bg-slate-800/50 rounded-md px-3 py-1.5 text-sm text-slate-400 border border-slate-700/50">
          <Search size={16} className="mr-2" />
          <span className="mr-4">Search...</span>
          <kbd className="text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">⌘K</kbd>
        </div>
        
        <button className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors">
          <Share size={16} className="mr-2" />
          Share
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm shadow-blue-900/20">
          <Zap size={16} className="mr-2" />
          AI Process
        </button>
        
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium ml-2">
          {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
