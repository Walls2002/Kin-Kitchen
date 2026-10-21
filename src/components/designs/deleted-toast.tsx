"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { restoreSketch } from "@/lib/biz-actions";
import { useToast } from "../toast";
import { takeDeleted } from "./handoff";

/** Shows "Deleted …" with Undo on the page the editor returned to after a delete. */
export function DeletedDesignToast() {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    const row = takeDeleted();
    if (!row) return;
    toast({
      message: `Deleted “${row.title}”`,
      action: {
        label: "Undo",
        onAction: async () => {
          const res = await restoreSketch(row);
          if (res.ok) {
            toast({ message: "The design is back" });
            router.refresh();
          } else toast({ message: res.error, tone: "error" });
        },
      },
    });
  }, [toast, router]);
  return null;
}
