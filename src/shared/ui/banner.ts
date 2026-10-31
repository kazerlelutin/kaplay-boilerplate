import type { KAPLAYCtx } from "kaplay";

/**
 * Bannière plein écran (victoire / défaite) avec fond assombri.
 */
export function addBanner(k: KAPLAYCtx, title: string, subtitle: string): void {
  const cx = k.width() / 2;
  const cy = k.height() / 2;

  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(0.6),
    k.fixed(),
    k.z(150),
  ]);

  k.add([
    k.text(title, { size: 16 }),
    k.pos(cx, cy - 8),
    k.anchor("center"),
    k.fixed(),
    k.z(200),
  ]);

  k.add([
    k.text(subtitle, { size: 8 }),
    k.pos(cx, cy + 12),
    k.anchor("center"),
    k.fixed(),
    k.z(200),
  ]);
}
