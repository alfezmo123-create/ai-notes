"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Trash2, UserPlus, Shield } from "lucide-react";

interface WorkspaceMember {
  id: string;
  email: string;
  role: "HOST" | "VIEWER";
  workspaceId: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeWorkspaceId, currentUserRole } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const membersRef = collection(db, "workspaceMembers");
    const q = query(membersRef, where("workspaceId", "==", activeWorkspaceId));
    
    const unsub = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkspaceMember)));
    });

    return () => unsub();
  }, [activeWorkspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !activeWorkspaceId || !user) return;
    setIsInviting(true);
    setError("");

    try {
      const memberId = `${activeWorkspaceId}_${inviteEmail}`;
      await setDoc(doc(db, "workspaceMembers", memberId), {
        workspaceId: activeWorkspaceId,
        email: inviteEmail,
        role: "VIEWER",
        invitedBy: user.uid,
        invitedAt: new Date(),
      });
      setInviteEmail("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await deleteDoc(doc(db, "workspaceMembers", memberId));
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  if (currentUserRole !== "HOST") {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Workspace Settings</h1>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-slate-400">
          You are currently viewing this workspace as a <strong>VIEWER</strong>. 
          Only the Host can manage settings and members.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Workspace Settings</h1>
      
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-medium text-slate-200 mb-1">Members</h2>
          <p className="text-sm text-slate-400">Manage who has access to this workspace.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleInvite} className="flex gap-3 mb-8">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address to invite as Viewer..."
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isInviting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center transition-colors disabled:opacity-50"
            >
              <UserPlus size={16} className="mr-2" />
              {isInviting ? "Inviting..." : "Invite"}
            </button>
          </form>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="space-y-4">
            {/* Host is implicitly a member, we show them statically for clarity */}
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded border border-slate-800">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-bold mr-3">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{user?.email}</p>
                  <p className="text-xs text-slate-500">Workspace Owner</p>
                </div>
              </div>
              <div className="flex items-center text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-xs font-medium">
                <Shield size={14} className="mr-1" /> HOST
              </div>
            </div>

            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-slate-950 rounded border border-slate-800">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold mr-3">
                    {member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{member.email}</p>
                    <p className="text-xs text-slate-500">Invited Member</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 bg-slate-800 px-2 py-1 rounded text-xs font-medium uppercase">
                    {member.role}
                  </span>
                  <button 
                    onClick={() => handleRemove(member.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                You haven't invited anyone to this workspace yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
