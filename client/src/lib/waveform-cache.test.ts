import { describe, expect, it } from "vitest";
import { createWaveformCache, WAVEFORM_SAMPLES } from "./waveform-cache";

describe("waveform cache fallback", () => {
  it("does not make an imported track fail when audio decoding is unavailable", async () => {
    const waveform = await createWaveformCache(new Blob(["not decodable"], { type: "audio/mpeg" }));
    expect(waveform).toBeUndefined(); expect(WAVEFORM_SAMPLES).toBe(256);
  });
});
