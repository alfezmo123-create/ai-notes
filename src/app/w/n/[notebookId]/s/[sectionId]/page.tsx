"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { UploadedFile } from "@/types";
import { db, storage } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useState, useRef, use, useMemo } from "react";
import { Upload, X, FileImage, MoreVertical, Trash2, Download, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Define a type for optimistic local uploads
interface LocalUpload {
  name: string;
  progress: number;
  localUrl: string;
}

export default function SectionPage({ 
  params 
}: { 
  params: Promise<{ notebookId: string; sectionId: string }> 
}) {
  const { notebookId, sectionId } = use(params);
  const { files, notebooks, sections, currentUserRole, activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: LocalUpload }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<UploadedFile | null>(null);

  const notebook = notebooks.find(n => n.id === notebookId);
  const section = sections.find(s => s.id === sectionId);

  // Filter files for this section and sort by order
  const sectionFiles = useMemo(() => {
    return files.filter(f => f.sectionId === sectionId).sort((a, b) => a.order - b.order);
  }, [files, sectionId]);

  const canUpload = currentUserRole === 'OWNER' || currentUserRole === 'CONTRIBUTOR';
  const canDelete = currentUserRole === 'OWNER'; 

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !user || !activeWorkspaceId) return;
    
    // Convert to array and sort alphabetically by name to preserve logical order of multi-file upload
    const selectedFiles = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
    if (selectedFiles.length === 0) return;

    let successCount = 0;
    // Current highest order to append new files at the end
    const highestOrder = sectionFiles.length > 0 ? sectionFiles[sectionFiles.length - 1].order : 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      let file = selectedFiles[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 15MB before compression).`);
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      setUploadProgress(prev => ({ 
        ...prev, 
        [file.name]: { name: file.name, progress: 0, localUrl } 
      }));

      try {
        // Compress the image before upload for extreme speed and lower costs
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        file = await imageCompression(file, options);
      } catch (error) {
        console.error("Compression error", error);
      }

      const fileId = crypto.randomUUID();
      const storageRef = ref(storage, `workspaces/${activeWorkspaceId}/pages/${fileId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ 
            ...prev, 
            [file.name]: { ...prev[file.name], progress } 
          }));
        },
        (error) => {
          console.error("Upload failed", error);
          toast.error(`Failed to upload ${file.name}`);
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, "files"), {
            workspaceId: activeWorkspaceId,
            notebookId,
            sectionId,
            storagePath: storageRef.fullPath,
            originalName: file.name,
            displayName: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedBy: user.uid,
            uploadedAt: serverTimestamp(),
            order: highestOrder + i + 1, // Add precisely after the highest existing order
            thumbnailUrl: downloadURL
          });
          
          successCount++;
          toast.success(`Uploaded ${file.name}`);
          setUploadProgress(prev => {
            const next = { ...prev };
            URL.revokeObjectURL(next[file.name].localUrl); // Free memory
            delete next[file.name];
            return next;
          });
        }
      );
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!confirm(`Delete ${file.displayName}?`)) return;
    try {
      await deleteDoc(doc(db, "files", file.id));
      const fileRef = ref(storage, file.storagePath);
      await deleteObject(fileRef);
      toast.success("Page deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete page");
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sectionFiles.length - 1) return;

    const fileA = sectionFiles[index];
    const fileB = sectionFiles[direction === 'up' ? index - 1 : index + 1];

    try {
      // Swap their order fields in Firestore
      await updateDoc(doc(db, "files", fileA.id), { order: fileB.order });
      await updateDoc(doc(db, "files", fileB.id), { order: fileA.order });
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to move page");
    }
  };

  const isUploadingAny = Object.keys(uploadProgress).length > 0;

  if (!section || !notebook) {
    return <div className="p-8 text-slate-400 flex items-center justify-center h-full">Loading section...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Aesthetic glowing background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex items-center justify-between p-6 border-b border-slate-800/50 backdrop-blur-xl relative z-10">
        <div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-blue-400/80 mb-1 font-medium tracking-wide">
            {notebook.name} / {section.name}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-semibold text-slate-100 tracking-tight">
            {section.name}
          </motion.h1>
        </div>
        
        {canUpload && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-full text-sm font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:shadow-[0_0_30px_rgba(37,99,235,0.25)]"
              disabled={isUploadingAny}
            >
              <Upload size={16} className="mr-2" />
              Upload Pages
            </button>
          </motion.div>
        )}
      </div>

      <div className="p-6 flex-1 overflow-y-auto relative z-10">
        {sectionFiles.length === 0 && !isUploadingAny && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800 bg-slate-900/20 rounded-2xl backdrop-blur-sm"
          >
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 text-slate-500">
              <FileImage size={24} />
            </div>
            <h3 className="text-xl font-medium text-slate-300">No pages yet</h3>
            <p className="text-slate-500 text-sm mt-2 mb-6">Upload images to start building this notebook section.</p>
            {canUpload && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Click here to browse files
              </button>
            )}
          </motion.div>
        )}

        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <AnimatePresence mode="popLayout">
            {sectionFiles.map((file, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                key={file.id} 
                className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(37,99,235,0.15)] flex flex-col"
              >
                {/* Page Number Badge */}
                <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-sm border border-white/10">
                  PAGE {index + 1}
                </div>

                <div 
                  className="aspect-[3/4] bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer relative"
                  onClick={() => setViewerFile(file)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={file.thumbnailUrl} 
                    alt={file.displayName} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
                
                <div className="p-3 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/50">
                  <span className="text-xs font-medium text-slate-300 truncate pr-2 opacity-80">{file.displayName}</span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl rounded-xl">
                      <DropdownMenuItem 
                        className="text-slate-300 cursor-pointer hover:bg-slate-800 rounded-lg m-1"
                        onClick={() => window.open(file.thumbnailUrl, "_blank")}
                      >
                        <Download size={14} className="mr-2 opacity-70" /> Download Original
                      </DropdownMenuItem>
                      
                      {canUpload && index > 0 && (
                        <DropdownMenuItem 
                          className="text-slate-300 cursor-pointer hover:bg-slate-800 rounded-lg m-1"
                          onClick={() => moveOrder(index, 'up')}
                        >
                          <ArrowLeft size={14} className="mr-2 opacity-70" /> Move Forward
                        </DropdownMenuItem>
                      )}
                      
                      {canUpload && index < sectionFiles.length - 1 && (
                        <DropdownMenuItem 
                          className="text-slate-300 cursor-pointer hover:bg-slate-800 rounded-lg m-1"
                          onClick={() => moveOrder(index, 'down')}
                        >
                          <ArrowRight size={14} className="mr-2 opacity-70" /> Move Backward
                        </DropdownMenuItem>
                      )}

                      {canDelete && (
                        <DropdownMenuItem 
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/50 cursor-pointer rounded-lg m-1 mt-2 border-t border-slate-800/50 pt-2"
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 size={14} className="mr-2" /> Delete Page
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}

            {/* Optimistic Upload Progress Placeholders */}
            {Object.entries(uploadProgress).map(([fileName, upload]) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                key={fileName} 
                className="group relative bg-slate-900/40 backdrop-blur-md border border-blue-500/30 rounded-xl overflow-hidden shadow-xl flex flex-col"
              >
                <div className="absolute top-2 left-2 z-20 bg-blue-500/80 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-sm animate-pulse">
                  UPLOADING
                </div>

                <div className="aspect-[3/4] bg-slate-950 flex flex-col items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={upload.localUrl} 
                    alt="Uploading preview" 
                    className="w-full h-full object-cover opacity-30 blur-sm grayscale-[30%] transition-all"
                  />
                  
                  {/* Circular/Bar Progress Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-700 relative flex items-center justify-center">
                       <svg className="absolute inset-0 w-full h-full -rotate-90">
                         <circle 
                           cx="50%" 
                           cy="50%" 
                           r="28" 
                           fill="none" 
                           stroke="currentColor" 
                           strokeWidth="4" 
                           className="text-blue-500 transition-all duration-300"
                           strokeDasharray="175"
                           strokeDashoffset={175 - (175 * upload.progress) / 100}
                         />
                       </svg>
                       <span className="text-xs font-bold text-white shadow-sm">{Math.round(upload.progress)}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/50">
                  <span className="text-xs font-medium text-slate-400 truncate block opacity-70">{fileName}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox Viewer */}
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
                  {viewerFile.displayName}
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
