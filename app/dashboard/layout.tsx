import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Terminal, 
  Settings, 
  LogOut,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Button } from "@/app/_components/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex text-text-primary font-sans overflow-hidden">
      {/* Sidebar Industrial */}
      <aside className="w-64 border-r border-border-subtle bg-surface flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-border-subtle flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-blue/10 border border-accent-blue/20 rounded flex items-center justify-center">
            <Terminal className="w-4 h-4 text-accent-blue" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tighter uppercase">AULA IT</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="primary" className="w-full justify-start gap-2 border-transparent">
            <LayoutDashboard className="w-4 h-4" />
            DASHBOARD
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-text-muted hover:text-text-primary">
            <BookOpen className="w-4 h-4" />
            COURSES
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-text-muted hover:text-text-primary">
            <ShieldCheck className="w-4 h-4" />
            CERTIFICATIONS
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-text-muted hover:text-text-primary">
            <Zap className="w-4 h-4" />
            ASSIGNMENTS
          </Button>
        </nav>
        
        <div className="p-4 border-t border-border-subtle space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-border-subtle border border-border-subtle overflow-hidden flex items-center justify-center text-xs font-mono">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate">{user.email?.split('@')[0].toUpperCase()}</p>
              <p className="text-[10px] font-mono text-text-muted truncate uppercase tracking-tighter">STUDENT_LEVEL_1</p>
            </div>
          </div>
          <form action="/auth/sign-out" method="post">
            <Button variant="danger" size="sm" className="w-full gap-2">
              <LogOut className="w-3 h-3" />
              TERMINATE SESSION
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto h-screen">
        {/* Header Precision */}
        <header className="h-16 border-b border-border-subtle flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-text-muted uppercase">SYSTEM_STATE:</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[10px] font-mono text-accent-green uppercase font-bold tracking-widest">ONLINE</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-text-muted">FEB 27, 2026 - 13:40 UTC</span>
            <div className="w-px h-4 bg-border-subtle mx-2" />
            <Settings className="w-4 h-4 text-text-muted hover:text-text-primary cursor-pointer transition-colors" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
