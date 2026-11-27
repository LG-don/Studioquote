"use client";

// Scope and pricing now live together on the Quote screen. Kept so old links still work.
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui";

export default function Redirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => router.replace(`/projects/${id}/quote`), [id, router]);
  return <Loading />;
}
