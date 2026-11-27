"use client";

import { useEffect, useMemo, useState } from "react";
import { keepFor } from "@/lib/costing";
import { useData } from "@/lib/data";
import type { Project } from "@/lib/types";

/** What the studio keeps on this project, sharing costs with the other ongoing projects. */
export function useKeep(project: Project | null) {
  const { store, settings } = useData();
  const [all, setAll] = useState<Project[]>([]);
  useEffect(() => {
    store.listProjects().then(setAll).catch(() => setAll([]));
  }, [store, project?.id]);
  return useMemo(() => (project ? keepFor(project, all, settings?.studioCosts) : null), [project, all, settings]);
}
