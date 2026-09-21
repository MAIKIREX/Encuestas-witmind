"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatMinutes } from "@/lib/format";

export type PickableTest = {
  id: string;
  name: string;
  description: string | null;
  time_limit_seconds: number | null;
};

export function TestPicker({
  tests,
  name = "testIds",
  defaultSelected = [],
}: {
  tests: PickableTest[];
  name?: string;
  defaultSelected?: string[];
}) {
  if (!tests.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay pruebas activas en el banco de pruebas todavía.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {tests.map((test) => (
        <Label
          key={test.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3 has-[[data-checked]]:border-primary"
        >
          <Checkbox
            name={name}
            value={test.id}
            defaultChecked={defaultSelected.includes(test.id)}
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
    </div>
  );
}
