"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { sileo } from "sileo";

import { createJob } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = { error?: string; success?: boolean } | null;

export function NewJobDialog({ assessments }: { assessments: { id: string; name: string }[] }) {
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
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva convocatoria
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nueva convocatoria</CardTitle>
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
            <Label htmlFor="assessmentId">Batería de evaluación</Label>
            <select
              id="assessmentId"
              name="assessmentId"
              required
              defaultValue=""
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Selecciona una batería
              </option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
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
