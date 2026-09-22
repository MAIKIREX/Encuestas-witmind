"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { sileo } from "sileo";

import { createJob } from "@/app/actions/admin";
import { type PickableTest, TestPicker } from "@/components/admin/test-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = { error?: string; success?: boolean } | null;

export function NewJobDialog({ tests }: { tests: PickableTest[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(createJob, null);

  useEffect(() => {
    if (state?.error) sileo.error({ title: "No se pudo crear", description: state.error });
    if (state?.success) {
      sileo.success({
        title: "Convocatoria creada",
        description: "Se guardó como borrador. Publícala cuando esté lista.",
      });
    }
  }, [state]);

  if (!open) {
    return (
      <div className="flex justify-center">
        <Button
          onClick={() => setOpen(true)}
          className="h-11 px-6 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-sm shadow-[0_10px_25px_-5px_rgba(186,94,48,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="size-4 mr-1.5" />
          Nueva convocatoria
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full tactile-card-forest border-white/20 p-2 sm:p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Nueva convocatoria</CardTitle>
      </CardHeader>

      <CardContent>
        {/* La key vacía los campos tras guardar, sin cerrar el formulario. */}
        <form key={state?.success ? "saved" : "editing"} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título del puesto</Label>
            <Input id="title" name="title" required placeholder="Encuestador de campo" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={5} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" name="location" placeholder="Lima" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employmentType">Modalidad</Label>
              <Input id="employmentType" name="employmentType" placeholder="Tiempo completo" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Pruebas que rendirá el postulante</Label>
            <p className="text-xs text-muted-foreground">
              Elige las pruebas que veas convenientes para este puesto. Cada una indica de qué
              trata para ayudarte a decidir.
            </p>
            <TestPicker tests={tests} />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear como borrador"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
