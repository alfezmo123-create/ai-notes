"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  Settings,
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import NotebookTree from "./NotebookTree";
import { useState } from "react";

export default function Sidebar() {
  const { user } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 w-64 shadow-xl">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <div className="font-semibold text-lg text-slate-100 flex items-center">
          <div className="w-6 h-6 rounded bg-blue-600 mr-2 flex items-center justify-center text-xs">AI</div>
          Notes
        </div>
        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <SidebarItem icon={<Home size={18} />} label="Home" href="/w" onClick={() => setMobileOpen(false)} />
        
        <NotebookTree />
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <SidebarItem icon={<Settings size={18} />} label="Settings" href="/w/settings" onClick={() => setMobileOpen(false)} />
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
        >
          <LogOut size={18} className="mr-3" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Button (visible only on small screens) */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="md:hidden absolute top-3 left-4 z-20 p-1.5 bg-slate-800 rounded-md text-slate-200 hover:bg-slate-700 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        {SidebarContent}
      </aside>
    </>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  href, 
  onClick 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  href: string; 
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link 
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive 
          ? "bg-blue-600/10 text-blue-400" 
          : "hover:bg-slate-800/50 hover:text-slate-200"
      }`}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {label}
    </Link>
  );
}
