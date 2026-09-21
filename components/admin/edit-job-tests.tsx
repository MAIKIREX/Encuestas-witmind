"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";

import { updateJobTests } from "@/app/actions/admin";
import { type PickableTest } from "@/components/admin/test-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatMinutes } from "@/lib/format";

export function EditJobTests({
  jobId,
  tests,
  selectedIds,
}: {
  jobId: string;
  tests: PickableTest[];
  selectedIds: string[];
}) {
  const [selected, setSelected] = useState(new Set(selectedIds));
  const [pending, startTransition] = useTransition();

  function toggle(testId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(testId);
      else next.delete(testId);
      return next;
    });
  }

  return (
    <div className="grid gap-2">
      {tests.map((test) => (
        <Label
          key={test.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3 has-[[data-checked]]:border-primary"
        >
          <Checkbox
            checked={selected.has(test.id)}
            onCheckedChange={(checked) => toggle(test.id, checked)}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              {test.name}
              {test.time_limit_seconds ? (
                <span className="text-xs font-normal text-muted-foreground">
                  · {formatMinutes(test.time_limit_seconds)}
                </span>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {test.description || "Sin descripción disponible."}
            </span>
          </span>
        </Label>
      ))}

      <Button
        size="sm"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateJobTests(jobId, [...selected]);
            if (result?.error) {
              sileo.error({ title: "No se pudo guardar", description: result.error });
            } else {
              sileo.success({ title: "Pruebas actualizadas" });
            }
          })
        }
      >
        {pending ? "Guardando…" : "Guardar pruebas"}
      </Button>
    </div>
  );
}
