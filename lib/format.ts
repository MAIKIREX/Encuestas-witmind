export function formatMinutes(seconds: number | null | undefined) {
  if (!seconds) return "Sin límite";
  const min = Math.round(seconds / 60);
  return `${min} min`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "—";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min} min ${sec}s` : `${sec}s`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function clockFromSeconds(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  applied: "Postulado",
  in_progress: "En proceso",
  completed: "Evaluación completa",
  shortlisted: "Preseleccionado",
  rejected: "No seleccionado",
  hired: "Contratado",
};

export function applicationStatusLabel(status: string) {
  return APPLICATION_STATUS_LABEL[status] ?? status;
}

const INTEGRITY_LABEL: Record<string, string> = {
  info: "Sin incidencias",
  warn: "Algunas incidencias",
  critical: "Incidencias graves",
  disqualified: "Prueba descalificada",
};

export function integrityLabel(level: string) {
  return INTEGRITY_LABEL[level] ?? level;
}
