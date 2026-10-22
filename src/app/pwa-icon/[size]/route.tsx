import { ImageResponse } from "next/og";
import { MARK_SVG } from "@/components/mark";

const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG("#f7f3e8", "#523727"))}`;
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt="" />,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
