export type ZoneId = "wua" | "exterior";
export type Landmark = "D" | "A" | "G" | "C" | "R";

export interface TilePoint { x: number; y: number }
export interface ZoneMap {
  id: ZoneId;
  title: string;
  tiles: string[];
  start: TilePoint;
  colors: { floor: [number, number, number]; alternate: [number, number, number]; wall: [number, number, number] };
}

export const MAPS: Record<ZoneId, ZoneMap> = {
  wua: {
    id: "wua",
    title: "Citadelle WUA — Aile des opérateurs",
    tiles: [
      "#########",
      "#.......#",
      "#..D....#",
      "#.......#",
      "#.....A.#",
      "#.......G",
      "#...P...#",
      "#########",
    ],
    start: {x:4,y:6},
    colors: { floor:[95,113,119], alternate:[107,125,131], wall:[49,61,78] },
  },
  exterior: {
    id: "exterior",
    title: "Plaine désolée — Reconnaissance",
    tiles: [
      "##########",
      "#........#",
      "#........#",
      "#...C....#",
      "#........#",
      "#........#",
      "R........#",
      "##########",
    ],
    start: {x:1,y:6},
    colors: { floor:[137,104,78], alternate:[152,117,85], wall:[79,69,69] },
  },
};
export function tileAt(zone:ZoneMap,point:TilePoint):string {
  return zone.tiles[point.y]?.[point.x]??"#";
}
export function walkable(zone:ZoneMap,point:TilePoint):boolean {
  return [".","P"].includes(tileAt(zone,point));
}
export function nearbyLandmark(zone:ZoneMap,point:TilePoint):Landmark|null {
  const order:Landmark[]=["D","A","C","G","R"];
  for(const marker of order)for(let y=0;y<zone.tiles.length;y++)
    for(let x=0;x<zone.tiles[y].length;x++)
      if(zone.tiles[y][x]===marker && Math.abs(point.x-x)+Math.abs(point.y-y)<=1)return marker;
  return null;
}
