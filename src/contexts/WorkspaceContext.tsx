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
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  notebooks: [],
  sections: [],
  pages: [],
  loading: true,
});

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  // For this MVP, we assume the user has exactly one default workspace.
  // We'll use the user's ID as their primary workspaceId for simplicity.
  // In a full production build, we'd fetch workspaces first.
  const workspaceId = user?.uid;

  useEffect(() => {
    if (!workspaceId) {
      setNotebooks([]);
      setSections([]);
      setPages([]);
      setLoading(false);
      return;
    }

    // Subscriptions
    const notebooksRef = collection(db, "notebooks");
    const qNotebooks = query(notebooksRef, where("workspaceId", "==", workspaceId), orderBy("order", "asc"));
    const unsubNotebooks = onSnapshot(qNotebooks, (snapshot) => {
      setNotebooks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notebook)));
    });

    const sectionsRef = collection(db, "sections");
    const qSections = query(sectionsRef, where("workspaceId", "==", workspaceId), orderBy("order", "asc"));
    const unsubSections = onSnapshot(qSections, (snapshot) => {
      setSections(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Section)));
    });

    const pagesRef = collection(db, "pages");
    const qPages = query(pagesRef, where("workspaceId", "==", workspaceId), orderBy("order", "asc"));
    const unsubPages = onSnapshot(qPages, (snapshot) => {
      setPages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Page)));
    });

    setLoading(false);

    return () => {
      unsubNotebooks();
      unsubSections();
      unsubPages();
    };
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider value={{ notebooks, sections, pages, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
