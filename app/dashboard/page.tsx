import { createClient } from "@/utils/supabase/server";
import { Zap } from "lucide-react";
import { Button } from "@/app/_components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-sans font-bold tracking-tight uppercase">
            WELCOME_BACK, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm font-mono text-text-muted mt-1 tracking-tighter uppercase">
            SMR / ASIR / DAW / DAM TRACKING INTERFACE
          </p>
        </div>
        <Button variant="primary" size="lg" className="rounded-full h-12 w-12 p-0 shadow-[0_0_20px_rgba(0,112,243,0.3)]">
          <Zap className="w-6 h-6" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>AVERAGE_GRADE</CardDescription>
            <CardTitle className="text-4xl text-accent-green font-mono">8.95</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] font-mono text-text-muted uppercase">+0.4 FROM LAST SEMESTER</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>CREDITS_COMPLETED</CardDescription>
            <CardTitle className="text-4xl font-mono">124 / 240</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] font-mono text-text-muted uppercase">51.6% TOTAL PROGRESS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>ACTIVE_CERTIFICATIONS</CardDescription>
            <CardTitle className="text-4xl text-accent-blue font-mono">04</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] font-mono text-text-muted uppercase">3 RENEWALS PENDING</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-border-subtle -mx-6 px-6 pb-4">
          <CardTitle className="tracking-tighter">CURRENT_MODULES_STATUS</CardTitle>
          <CardDescription>ACTIVE ACADEMIC DEPLOYMENTS</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[
              { name: "NETWORK_ARCHITECTURE", grade: 9.2, status: "stable", accent: "bg-accent-green" },
              { name: "DATABASE_MANAGEMENT", grade: 8.5, status: "active", accent: "bg-accent-blue" },
              { name: "SYSTEM_SECURITY", grade: 7.8, status: "warning", accent: "bg-accent-amber" },
            ].map((module) => (
              <div key={module.name} className="flex items-center justify-between p-4 border border-border-subtle bg-background rounded-md group hover:border-accent-blue/50 transition-colors cursor-default">
                <div className="flex items-center gap-4">
                  <div className={`w-1.5 h-1.5 rounded-full ${module.accent}`} />
                  <span className="font-mono text-sm group-hover:text-accent-blue transition-colors tracking-tight">{module.name}</span>
                </div>
                <div className="flex items-center gap-8 font-mono text-sm">
                  <span className="text-text-muted uppercase tracking-tighter hidden sm:inline">STATUS: {module.status}</span>
                  <span className="font-bold tabular-nums">GRADE_{module.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
