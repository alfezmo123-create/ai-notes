"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useParams } from "next/navigation";
import BlockEditor from "@/components/editor/BlockEditor";
import { Loader2 } from "lucide-react";

export default function PageView() {
  const { pageId } = useParams();
  const { pages, loading } = useWorkspace();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <div className="text-4xl mb-4">📄</div>
        <h2 className="text-xl font-medium mb-2 text-slate-300">Page not found</h2>
        <p>This page may have been deleted or you don't have access.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      <BlockEditor page={page} />
    </div>
  );
}
