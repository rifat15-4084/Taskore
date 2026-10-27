"use client";

import { use } from "react";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export default function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectDetailView id={id} basePath="/admin/projects" />;
}
