import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      <SiteHeader />

      <div className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-2">
          <Button variant="ghost" size="sm" render={<Link href="/admin/convocatorias" />}>
            Convocatorias
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/admin/tests" />}>
            Banco de pruebas
          </Button>
        </div>
      </div>

      {children}
    </>
  );
}
