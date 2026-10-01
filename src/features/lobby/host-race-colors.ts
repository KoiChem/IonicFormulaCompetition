export const runnerPalette = ["#1763a6", "#0e746d", "#9b4c09", "#873e92", "#aa3038", "#3c6c12", "#8d4c13", "#2654a8", "#a33570", "#326e82", "#6d3f9f", "#a0442b", "#126f86", "#7a5260", "#506b18", "#8c4059", "#5356a3", "#2a6c50", "#7b5b20", "#9a396d"] as const;

export function colorForRunner(id: string): string {
  let hash = 0;
  for (const char of id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return runnerPalette[(hash >>> 0) % runnerPalette.length];
}
