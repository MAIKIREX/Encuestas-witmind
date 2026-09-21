import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      <SiteHeader />

      <div className="border-b border-border/40 bg-background/60 backdrop-blur-xs">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 sm:px-6 py-2">
          <Button variant="ghost" size="sm" render={<Link href="/admin/convocatorias" />}>
            Convocatorias
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/admin/tests" />}>
            Banco de pruebas
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
