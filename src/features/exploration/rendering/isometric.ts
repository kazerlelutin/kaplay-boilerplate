import type { KAPLAYCtx } from "kaplay";
import type { TilePoint, ZoneMap } from "../domain/maps";

export interface IsoMarker {
  move(point: TilePoint): void;
}

export function project(point: TilePoint): { x: number; y: number } {
  return { x: 160 + (point.x - point.y) * 16, y: 19 + (point.x + point.y) * 8 };
}

function character(k: KAPLAYCtx, point: TilePoint, rgb: [number, number, number]): IsoMarker {
  const body = k.add([k.rect(8, 11), k.pos(0, 0), k.color(...rgb), k.z(40)]);
  const head = k.add([k.circle(4), k.pos(0, 0), k.color(220, 196, 159), k.z(41)]);
  function move(next: TilePoint): void {
    const p = project(next);
    body.pos = k.vec2(p.x - 4, p.y - 5);
    head.pos = k.vec2(p.x, p.y - 9);
    body.z = 30 + (next.x + next.y) * 2;
    head.z = body.z + 1;
  }
  move(point);
  return { move };
}

/** Seule la projection est isométrique : collisions et gameplay restent sur grille 2D. */
export function renderZone(k: KAPLAYCtx, zone: ZoneMap, start: TilePoint): IsoMarker {
  for (let y = 0; y < zone.tiles.length; y += 1) {
    for (let x = 0; x < zone.tiles[y].length; x += 1) {
      const symbol = zone.tiles[y][x];
      const p = project({ x, y });
      const base = (x + y) % 2 === 0 ? zone.colors.floor : zone.colors.alternate;
      k.add([
        k.polygon([k.vec2(0, 0), k.vec2(16, 8), k.vec2(0, 16), k.vec2(-16, 8)]),
        k.pos(p.x, p.y),
        k.color(...base),
        k.outline(1, k.rgb(45, 48, 56)),
        k.z(0),
      ]);
      if (symbol === "#") {
        k.add([k.rect(20, 13), k.pos(p.x - 10, p.y - 9), k.color(...zone.colors.wall), k.z(15 + x + y)]);
      } else if (symbol === "I") {
        character(k, { x, y }, [144, 99, 185]);
      } else if (symbol === "E") {
        character(k, { x, y }, [184, 91, 70]);
      } else if (symbol !== "." && symbol !== "P") {
        const colors: Record<string, [number, number, number]> = {
          G: [226, 181, 93], C: [74, 227, 186], R: [87, 174, 211],
        };
        k.add([
          k.rect(9, 9),
          k.pos(p.x - 4, p.y - 3),
          k.color(...(colors[symbol] ?? [200, 200, 200])),
          k.z(30 + (x + y) * 2),
        ]);
      }
    }
  }
  return character(k, start, [78, 177, 219]);
}
