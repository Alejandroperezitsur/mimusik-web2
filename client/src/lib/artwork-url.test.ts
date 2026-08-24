import { afterEach, describe, expect, it, vi } from "vitest";
import { artworkUrlReleaseGraceMs, releaseArtworkUrl, retainArtworkUrl } from "./artwork-url";

describe("artwork object URLs", () => {
  afterEach(() => vi.useRealTimers());

  it("shares one URL between mounted artwork consumers and revokes it only after the grace period", () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mimusik-cover");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const cover = new Blob(["cover"], { type: "image/jpeg" });

    expect(retainArtworkUrl(cover)).toBe("blob:mimusik-cover");
    expect(retainArtworkUrl(cover)).toBe("blob:mimusik-cover");
    expect(create).toHaveBeenCalledTimes(1);
    releaseArtworkUrl(cover);
    vi.advanceTimersByTime(artworkUrlReleaseGraceMs);
    expect(revoke).not.toHaveBeenCalled();
    releaseArtworkUrl(cover);
    vi.advanceTimersByTime(artworkUrlReleaseGraceMs - 1);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith("blob:mimusik-cover");
  });
});
