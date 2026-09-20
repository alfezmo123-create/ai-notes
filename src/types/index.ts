export type Role = "HOST" | "VIEWER";

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

export type BlockType = 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bullet_list' | 'numbered_list' | 'checklist' | 'code' | 'image' | 'file' | 'ai_generated' | 'quote' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string; // text content or URL/JSON for complex blocks
  metadata?: any;
}

export interface Page {
  id: string;
  workspaceId: string;
  sectionId: string;
  title: string;
  blocks: Block[];
  version: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  blocks: Block[];
  createdAt: Date;
  createdBy: string;
  version: number;
}

export type FileStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED" | "REVIEW_REQUIRED";

export interface UploadedFile {
  id: string;
  workspaceId: string;
  pageId?: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: FileStatus;
  uploadedBy: string;
  uploadedAt: Date;
}

export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AIProposal {
  id: string;
  workspaceId: string;
  targetPageId: string;
  sourceFileId: string;
  status: ProposalStatus;
  proposedChanges: any; // JSON representation of the changes
  createdAt: Date;
}
