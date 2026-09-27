"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { Notebook, Section, UploadedFile, Role } from "@/types";

interface WorkspaceContextType {
  notebooks: Notebook[];
  sections: Section[];
  files: UploadedFile[];
  loading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  currentUserRole: Role | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  notebooks: [],
  sections: [],
  files: [],
  loading: true,
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
  currentUserRole: null,
});

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // By default, the user's own workspace is active
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  useEffect(() => {
    if (user && !activeWorkspaceId) {
      setActiveWorkspaceId(user.uid);
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId || !user) {
      setNotebooks([]);
      setSections([]);
      setFiles([]);
      setCurrentUserRole(null);
      setLoading(false);
      return;
    }

    // Determine Role
    if (activeWorkspaceId === user.uid) {
      setCurrentUserRole("OWNER");
    } else {
      // For shared workspaces, fetch role
      // This is a simple implementation; in production, you'd use a real-time listener or token claims
      setCurrentUserRole("VIEWER"); 
    }

    // Subscriptions
    const notebooksRef = collection(db, "notebooks");
    const qNotebooks = query(notebooksRef, where("workspaceId", "==", activeWorkspaceId), orderBy("order", "asc"));
    const unsubNotebooks = onSnapshot(qNotebooks, (snapshot) => {
      setNotebooks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notebook)));
    });

    const sectionsRef = collection(db, "sections");
    const qSections = query(sectionsRef, where("workspaceId", "==", activeWorkspaceId), orderBy("order", "asc"));
    const unsubSections = onSnapshot(qSections, (snapshot) => {
      setSections(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Section)));
    });

    const filesRef = collection(db, "files");
    const qFiles = query(filesRef, where("workspaceId", "==", activeWorkspaceId), orderBy("order", "asc"));
    const unsubFiles = onSnapshot(qFiles, (snapshot) => {
      setFiles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UploadedFile)));
    });

    setLoading(false);

    return () => {
      unsubNotebooks();
      unsubSections();
      unsubFiles();
    };
  }, [activeWorkspaceId, user]);

  return (
    <WorkspaceContext.Provider value={{ notebooks, sections, files, loading, activeWorkspaceId, setActiveWorkspaceId, currentUserRole }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);

