import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        </div>
      </WorkspaceProvider>
    </ProtectedRoute>
  );
}
