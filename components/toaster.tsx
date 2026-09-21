"use client";

import { Toaster as SileoToaster } from "sileo";

export function Toaster(props: React.ComponentProps<typeof SileoToaster>) {
  return <SileoToaster {...props} />;
}
