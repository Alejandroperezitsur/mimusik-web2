import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./database";
import { isSupportedAudioFile } from "./importer";

vi.mock("./metadata", () => ({ readMetadata: vi.fn(async () => ({ title: "Test import", artist: "Local", album: "Batch" })), readDuration: vi.fn(async () => 123) }));

beforeEach(async () => { await db.open(); await db.tracks.clear(); });

describe("import validation", () => {
  it("recognizes supported local audio types without accepting arbitrary files", () => {
    expect(isSupportedAudioFile({ name: "archive.flac", type: "" } as File)).toBe(true);
    expect(isSupportedAudioFile({ name: "notes.txt", type: "text/plain" } as File)).toBe(false);
  });
  it("reports duplicate local files as skipped instead of storing a second blob", async () => {
    const { importAudioFiles } = await import("./importer"); const file = new File(["audio"], "same-song.mp3", { type: "audio/mpeg", lastModified: 101 });
    const first = await importAudioFiles([file], () => undefined); const second = await importAudioFiles([file], () => undefined);
    expect(first.imported).toBe(1); expect(second.skipped).toBe(1); expect(await db.tracks.count()).toBe(1);
  });
});
