"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { UploadedFile } from "@/types";
import { db, storage } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useState, useRef, use, useMemo } from "react";
import { Upload, X, FileImage, MoreVertical, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function SectionPage({ 
  params 
}: { 
  params: Promise<{ notebookId: string; sectionId: string }> 
}) {
  const { notebookId, sectionId } = use(params);
  const { files, notebooks, sections, currentUserRole, activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<UploadedFile | null>(null);

  const notebook = notebooks.find(n => n.id === notebookId);
  const section = sections.find(s => s.id === sectionId);

  // Filter files for this section
  const sectionFiles = useMemo(() => {
    return files.filter(f => f.sectionId === sectionId).sort((a, b) => a.order - b.order);
  }, [files, sectionId]);

  const canUpload = currentUserRole === 'OWNER' || currentUserRole === 'CONTRIBUTOR';
  const canDelete = currentUserRole === 'OWNER'; // Based on spec: Only owner can manage everything, or contributors if we add granular checks

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !user || !activeWorkspaceId) return;
    
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 5MB limit.`);
        continue;
      }

      const fileId = crypto.randomUUID();
      const storageRef = ref(storage, `workspaces/${activeWorkspaceId}/pages/${fileId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        },
        (error) => {
          console.error("Upload failed", error);
          toast.error(`Failed to upload ${file.name}`);
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
            order: sectionFiles.length + successCount, // simplistic ordering
            thumbnailUrl: downloadURL // We use the direct url for MVP
          });
          
          successCount++;
          toast.success(`Uploaded ${file.name}`);
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        }
      );
    }
    
    setUploading(Object.keys(uploadProgress).length > 0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!confirm(`Delete ${file.displayName}?`)) return;
    try {
      await deleteDoc(doc(db, "files", file.id));
      const fileRef = ref(storage, file.storagePath);
      await deleteObject(fileRef);
      toast.success("File deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete file");
    }
  };

  if (!section || !notebook) {
    return <div className="p-8 text-slate-400">Loading section...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-500 mb-1">{notebook.name} / {section.name}</div>
          <h1 className="text-2xl font-bold text-slate-100">{section.name}</h1>
        </div>
        
        {canUpload && (
          <div>
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
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              disabled={uploading}
            >
              <Upload size={16} className="mr-2" />
              Upload Images
            </button>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {sectionFiles.length === 0 && !uploading && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl">
            <FileImage size={48} className="text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No images yet</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Upload your first image to this section</p>
            {canUpload && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-400 text-sm font-medium"
              >
                Click to upload
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sectionFiles.map((file) => (
            <div key={file.id} className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all shadow-sm">
              <div 
                className="aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setViewerFile(file)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={file.thumbnailUrl} 
                  alt={file.displayName} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300 truncate pr-2">{file.displayName}</span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-slate-500 hover:text-slate-300 p-1">
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-slate-800">
                    <DropdownMenuItem 
                      className="text-slate-300 cursor-pointer"
                      onClick={() => window.open(file.thumbnailUrl, "_blank")}
                    >
                      <Download size={14} className="mr-2" /> Download
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem 
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/50 cursor-pointer"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          
          {/* Upload Progress Placeholders */}
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="aspect-[4/3] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <Upload size={32} className="text-blue-500/50 mb-3 animate-pulse" />
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs text-slate-500 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="p-3">
                <span className="text-sm font-medium text-slate-400 truncate block">{fileName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Viewer */}
      <Dialog open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)}>
        <DialogContent className="max-w-[90vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none flex flex-col items-center justify-center">
          {viewerFile && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button 
                  onClick={() => window.open(viewerFile.thumbnailUrl, "_blank")}
                  className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={() => setViewerFile(null)}
                  className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
                >
                  <X size={20} />
                </button>
              </div>
              
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
