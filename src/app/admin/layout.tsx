import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin dashboard
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to chat
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
