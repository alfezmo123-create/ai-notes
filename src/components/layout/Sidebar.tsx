"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  Book, 
  Star, 
  Clock, 
  Search, 
  Settings, 
  User, 
  LogOut 
} from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import NotebookTree from "./NotebookTree";

export default function Sidebar() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      <div className="p-4 border-b border-slate-800">
        <div className="font-semibold text-lg text-slate-100 flex items-center">
          <div className="w-6 h-6 rounded bg-blue-600 mr-2 flex items-center justify-center text-xs">AI</div>
          Notes
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <SidebarItem icon={<Home size={18} />} label="Home" href="/w" active />
        <SidebarItem icon={<Book size={18} />} label="Notebooks" href="/w/notebooks" />
        <SidebarItem icon={<Star size={18} />} label="Favorites" href="/w/favorites" />
        <SidebarItem icon={<Clock size={18} />} label="Recent" href="/w/recent" />
        <SidebarItem icon={<Search size={18} />} label="Search" href="/w/search" />

        <NotebookTree />
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <SidebarItem icon={<Settings size={18} />} label="Settings" href="/w/settings" />
        <SidebarItem icon={<User size={18} />} label="Profile" href="/w/profile" />
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
        >
          <LogOut size={18} className="mr-3" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  href, 
  active,
  indent 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  href: string; 
  active?: boolean;
  indent?: boolean;
}) {
  return (
    <Link 
      href={href}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active 
          ? "bg-blue-600/10 text-blue-400" 
          : "hover:bg-slate-800/50 hover:text-slate-200"
      } ${indent ? "pl-9" : ""}`}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {label}
    </Link>
  );
}
