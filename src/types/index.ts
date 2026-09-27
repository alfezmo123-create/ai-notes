export type Role = "OWNER" | "CONTRIBUTOR" | "VIEWER";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string; // composite: workspaceId_userId
  workspaceId: string;
  userId: string;
  role: Role;
  allowedUploadSections?: string[];
  allowedUploadNotebooks?: string[];
  addedAt: Date;
}

export interface Notebook {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  workspaceId: string;
  notebookId: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedFile {
  id: string;
  workspaceId: string;
  notebookId: string;
  sectionId: string;
  storagePath: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  order: number;
  thumbnailUrl?: string;
}
