export const runnerPalette = ["#1763a6", "#0e746d", "#9b4c09", "#873e92", "#aa3038", "#3c6c12", "#8d4c13", "#2654a8", "#a33570", "#326e82", "#6d3f9f", "#a0442b", "#126f86", "#7a5260", "#506b18", "#8c4059", "#5356a3", "#2a6c50", "#7b5b20", "#9a396d"];
// The class capacity is 42; use explicit RGB colors to avoid HSL rounding collisions.
runnerPalette.push("#891a1a", "#23b84f", "#5b1a89", "#b8a623", "#1a7789", "#b82374", "#36891a", "#2923b8", "#893f1a", "#23b880", "#801a89", "#99b823", "#1a5189", "#b82342", "#1a8924", "#5b23b8", "#89641a", "#23b8b2", "#891a6d", "#67b823", "#1a2c89", "#b83623");

function roomSeed(roomId: string): number {
  let seed = 2166136261;
  for (const char of roomId) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return (seed >>> 0) || 1;
}

/** Random room UUID is the seed; persistent joinedOrder is the fixed color slot. */
export function colorForRunner(roomId: string, joinedOrder: number): string {
  const order = Number.isSafeInteger(joinedOrder) && joinedOrder > 0 ? joinedOrder : 1;
  let seed = roomSeed(roomId);
  const palette = [...runnerPalette];
  for (let index = palette.length - 1; index > 0; index -= 1) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const other = Math.floor((seed >>> 0) / 4294967296 * (index + 1));
    [palette[index], palette[other]] = [palette[other], palette[index]];
  }
  if (order <= palette.length) return palette[order - 1];
  // Removed participants keep their slots. Never wrap after 42 lifetime joins.
  // Reserve red 0..7 for overflow, disjoint from every initial palette color.
  // Permute 131072 dark RGB slots instead of rounded hue values.
  const value = ((order - palette.length - 1) * 50657 + (roomSeed(roomId) & 131071)) % 131072;
  const channels = [(value >>> 14) & 7, 32 + ((value >>> 7) & 127), 32 + (value & 127)];
  return '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');
}
