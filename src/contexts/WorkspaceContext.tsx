"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { Notebook, Section, Page } from "@/types";

interface WorkspaceContextType {
  notebooks: Notebook[];
  sections: Section[];
  pages: Page[];
  loading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  currentUserRole: "HOST" | "VIEWER" | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  notebooks: [],
  sections: [],
  pages: [],
  loading: true,
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
  currentUserRole: null,
});

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  
  // By default, the user's own workspace is active
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"HOST" | "VIEWER" | null>(null);

  useEffect(() => {
    if (user && !activeWorkspaceId) {
      setActiveWorkspaceId(user.uid);
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId || !user) {
      setNotebooks([]);
      setSections([]);
      setPages([]);
      setCurrentUserRole(null);
      setLoading(false);
      return;
    }

    // Determine Role
    if (activeWorkspaceId === user.uid) {
      setCurrentUserRole("HOST");
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
    const qSections = query(sectionsRef, where("workspaceId", "==", workspaceId), orderBy("order", "asc"));
    const unsubSections = onSnapshot(qSections, (snapshot) => {
      setSections(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Section)));
    });

    const pagesRef = collection(db, "pages");
    const qPages = query(pagesRef, where("workspaceId", "==", activeWorkspaceId), orderBy("order", "asc"));
    const unsubPages = onSnapshot(qPages, (snapshot) => {
      setPages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Page)));
    });

    setLoading(false);

    return () => {
      unsubNotebooks();
      unsubSections();
      unsubPages();
    };
  }, [activeWorkspaceId, user]);

  return (
    <WorkspaceContext.Provider value={{ notebooks, sections, pages, loading, activeWorkspaceId, setActiveWorkspaceId, currentUserRole }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
