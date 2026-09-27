"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { Book, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { UploadedFile } from "@/types";

export default function WorkspaceHome() {
  const { notebooks, sections, files, loading } = useWorkspace();
  const { user } = useAuth();
  const [viewerFile, setViewerFile] = useState<UploadedFile | null>(null);

  if (loading) {
    return <div className="p-8 text-slate-400">Loading workspace...</div>;
  }

  // Get recent 6 files
  const recentFiles = [...files].sort((a, b) => {
    return (b.uploadedAt?.toMillis() || 0) - (a.uploadedAt?.toMillis() || 0);
  }).slice(0, 6);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col h-full bg-slate-950">
      <h1 className="text-3xl font-semibold mb-2 text-slate-100">Welcome back, {user?.displayName || "User"}.</h1>
      <p className="text-slate-400 mb-8">Here is a quick overview of your workspace.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Your Notebooks Column */}
        <div className="lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-medium mb-4 text-slate-300 flex items-center">
            <Book size={20} className="mr-2 text-blue-500" />
            Your Workspace
          </h2>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex-1 overflow-y-auto">
            {notebooks.length === 0 ? (
              <div className="text-slate-500 text-sm p-4 text-center">No notebooks found.</div>
            ) : (
              <div className="space-y-1">
                {notebooks.map(notebook => (
                  <div key={notebook.id} className="p-2">
                    <div className="font-medium text-slate-200 mb-1 flex items-center">
                      <span className="mr-2">📕</span> {notebook.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Uploads Column */}
        <div className="lg:col-span-2 flex flex-col">
          <h2 className="text-xl font-medium mb-4 text-slate-300 flex items-center">
            <ImageIcon size={20} className="mr-2 text-green-500" />
            Recent Uploads
          </h2>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            {recentFiles.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">No recent uploads found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentFiles.map(file => {
                  const section = sections.find(s => s.id === file.sectionId);
                  const notebook = notebooks.find(n => n.id === file.notebookId);
                  
                  return (
                    <div key={file.id} className="group relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setViewerFile(file)}>
                      <div className="aspect-[4/3] bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm">
                        <div className="text-xs font-medium text-slate-200 truncate flex items-center">
                          <span className="mr-1">🖼️</span> 
                          {notebook?.name} — {section?.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      <Dialog open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)}>
        <DialogContent className="max-w-[90vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none flex flex-col items-center justify-center">
          {viewerFile && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={viewerFile.thumbnailUrl} 
                alt={viewerFile.displayName}
                className="max-w-full max-h-[85vh] object-contain rounded-md"
              />
              <div className="absolute bottom-4 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md text-sm">
                {viewerFile.displayName}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
