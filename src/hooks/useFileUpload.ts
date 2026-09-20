import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface UploadResult {
  url: string | null;
  error: Error | null;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { activeWorkspaceId } = useWorkspace();

  const uploadFile = async (file: File, pageId: string): Promise<UploadResult> => {
    if (!activeWorkspaceId) {
      return { url: null, error: new Error('No active workspace') };
    }

    // Basic validation
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Only images are supported currently') };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: new Error('File size exceeds 5MB limit') };
    }

    setIsUploading(true);
    setProgress(0);

    const fileId = crypto.randomUUID();
    const extension = file.name.split('.').pop();
    const filePath = `workspaces/${activeWorkspaceId}/pages/${pageId}/${fileId}.${extension}`;
    const storageRef = ref(storage, filePath);

    return new Promise((resolve) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error('Upload failed:', error);
          setIsUploading(false);
          resolve({ url: null, error });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setIsUploading(false);
            resolve({ url: downloadURL, error: null });
          } catch (error: any) {
            setIsUploading(false);
            resolve({ url: null, error });
          }
        }
      );
    });
  };

  return { uploadFile, isUploading, progress };
}
