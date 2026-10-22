import { Plus } from "@/components/icons";
import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { DesignGallery, type DesignCard } from "@/components/designs/gallery";
import { orderLabel } from "@/components/designs/handoff";
import { ButtonLink } from "@/components/ui";
import { today } from "@/lib/biz";
import { getRepo } from "@/lib/data";
import { relativeDays } from "@/lib/format";

export const metadata: Metadata = { title: "Cake designs" };
export const dynamic = "force-dynamic";

export default async function DesignsPage() {
  const repo = await getRepo();
  const [sketches, orders] = await Promise.all([repo.sketches.list(), repo.orders.list()]);
  const now = today();
  const byId = new Map(orders.map((o) => [o.id, o]));
  const cards: DesignCard[] = sketches
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((s) => {
      const o = s.order_id ? byId.get(s.order_id) : undefined;
      return {
        id: s.id,
        title: s.title,
        template: s.template,
        strokes: s.strokes,
        surface: s.surface ?? null,
        layers: s.layers ?? {},
        extra_views: s.extra_views ?? [],
        order: o ? orderLabel(o, true) : null,
        upcoming: !!o && o.due_date >= now && o.status !== "cancelled" && o.status !== "done",
        updated: relativeDays(s.updated_at),
      };
    });

  return (
    <>
      <PageHeader
        title="Cake designs"
        sub="Sketch a customer's cake, attach it to the order, send it as a picture."
        actions={
          // An empty gallery leads with its own big start button.
          cards.length > 0 && (
          <ButtonLink href="/designs/new" variant="primary" className="max-lg:hidden">
            <Plus aria-hidden />
            New design
          </ButtonLink>
          )
        }
      />
      <DesignGallery cards={cards} />
    </>
  );
}
