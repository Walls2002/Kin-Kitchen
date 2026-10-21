import type { Metadata } from "next";
import { getRepo } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sketch = await (await getRepo()).sketches.get(id);
  return { title: sketch ? sketch.title : "Cake design" };
}

/** The board itself is mounted by the designs layout. */
export default function DesignPage() {
  return null;
}
