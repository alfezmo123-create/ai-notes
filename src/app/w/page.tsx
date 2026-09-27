"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { Book, Image as ImageIcon, Download, X } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { UploadedFile } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export default function WorkspaceHome() {
  const { notebooks, sections, files, loading } = useWorkspace();
  const { user } = useAuth();
  const [viewerFile, setViewerFile] = useState<UploadedFile | null>(null);

  if (loading) {
    return <div className="p-8 text-slate-400 flex items-center justify-center h-full">Loading workspace...</div>;
  }

  // Get recent 6 files
  const recentFiles = [...files].sort((a, b) => {
    const aTime = a.uploadedAt && typeof (a.uploadedAt as any).toMillis === 'function' ? (a.uploadedAt as any).toMillis() : 0;
    const bTime = b.uploadedAt && typeof (b.uploadedAt as any).toMillis === 'function' ? (b.uploadedAt as any).toMillis() : 0;
    return bTime - aTime;
  }).slice(0, 6);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto flex flex-col min-h-full bg-slate-950 relative overflow-hidden">
      {/* Aesthetic glowing background effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative z-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight">
          Welcome back, {user?.displayName || "User"}.
        </h1>
        <p className="text-slate-400 mb-12 text-lg">Here is a quick overview of your workspace.</p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Your Notebooks Column */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 flex flex-col"
        >
          <h2 className="text-xl font-medium mb-4 text-slate-300 flex items-center">
            <Book size={20} className="mr-2 text-blue-500" />
            Your Workspace
          </h2>
          
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-4 flex-1 shadow-2xl">
            {notebooks.length === 0 ? (
              <div className="text-slate-500 text-sm p-4 text-center">No notebooks found.</div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {notebooks.map(notebook => (
                  <motion.div variants={item} key={notebook.id} className="p-3 bg-slate-800/20 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-700/30">
                    <div className="font-medium text-slate-200 flex items-center">
                      <span className="mr-3 text-xl">📕</span> {notebook.name}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Recent Uploads Column */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 flex flex-col"
        >
          <h2 className="text-xl font-medium mb-4 text-slate-300 flex items-center">
            <ImageIcon size={20} className="mr-2 text-green-500" />
            Recent Uploads
          </h2>
          
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-2xl">
            {recentFiles.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-12 flex flex-col items-center">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                No recent uploads found.
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {recentFiles.map(file => {
                  const section = sections.find(s => s.id === file.sectionId);
                  const notebook = notebooks.find(n => n.id === file.notebookId);
                  
                  return (
                    <motion.div 
                      variants={item}
                      key={file.id} 
                      className="group relative bg-slate-950 border border-slate-700/50 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-blue-500/20 transition-all hover:border-blue-500/50" 
                      onClick={() => setViewerFile(file)}
                    >
                      <div className="aspect-[3/4] bg-slate-950 relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.displayName}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="text-xs font-semibold text-blue-400 mb-1">
                            PAGE {file.order + 1}
                          </div>
                          <div className="text-sm font-medium text-slate-100 truncate">
                            {section?.name}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {notebook?.name}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.div>

      </div>

      <AnimatePresence>
        {viewerFile && (
          <Dialog open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)}>
            <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 backdrop-blur-2xl border-none shadow-none flex flex-col items-center justify-center rounded-none z-[100]">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-12"
              >
                <div className="absolute top-4 md:top-8 right-4 md:right-8 z-50 flex gap-4">
                  <button 
                    onClick={() => window.open(viewerFile.thumbnailUrl, "_blank")}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                  >
                    <Download size={22} />
                  </button>
                  <button 
                    onClick={() => setViewerFile(null)}
                    className="p-3 bg-white/10 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-md"
                  >
                    <X size={22} />
                  </button>
                </div>
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={viewerFile.thumbnailUrl} 
                  alt={viewerFile.displayName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
                <div className="absolute bottom-8 bg-black/60 text-white px-6 py-3 rounded-full backdrop-blur-md text-sm font-medium border border-white/10 shadow-2xl">
                  {viewerFile.displayName} (Page {viewerFile.order + 1})
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
