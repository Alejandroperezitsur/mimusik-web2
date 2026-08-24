import { performance } from "node:perf_hooks";

function makeLibrary(size) {
  return Array.from({ length: size }, (_, index) => ({
    id: `bench-${index}`,
    title: `Local Recording ${String(index).padStart(5, "0")}`,
    artist: `Artist ${index % 180}`,
    album: `Album ${index % 420}`,
    duration: 120 + (index % 280),
    isFavorite: index % 11 === 0,
  }));
}

function measure(label, callback) {
  const started = performance.now(); const value = callback();
  return { label, milliseconds: Number((performance.now() - started).toFixed(2)), count: Array.isArray(value) ? value.length : Object.keys(value).length };
}

for (const size of [1000, 5000, 10000]) {
  const library = makeLibrary(size);
  const search = measure("search", () => library.filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes("recording 00")));
  const grouping = measure("grouping", () => library.reduce((groups, track) => { (groups[track.artist] ??= []).push(track.id); return groups; }, {}));
  const favorites = measure("favorites", () => library.filter((track) => track.isFavorite));
  const memory = process.memoryUsage();
  console.log(JSON.stringify({ size, search, grouping, favorites, heapUsedMiB: Number((memory.heapUsed / 1024 / 1024).toFixed(2)) }));
}
