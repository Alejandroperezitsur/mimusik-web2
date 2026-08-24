import { describe, expect, it } from "vitest";
import { resolvePlayerGesture } from "./use-player-gestures";

describe("mobile player gestures", () => {
  it("recognizes deliberate horizontal swipes", () => {
    expect(resolvePlayerGesture(-84, 12)).toBe("next");
    expect(resolvePlayerGesture(84, 12)).toBe("previous");
  });

  it("recognizes deliberate vertical player gestures", () => {
    expect(resolvePlayerGesture(8, -64)).toBe("open");
    expect(resolvePlayerGesture(8, 64)).toBe("close");
  });

  it("ignores short, diagonal, and scroll-like motion", () => {
    expect(resolvePlayerGesture(44, 4)).toBeUndefined();
    expect(resolvePlayerGesture(50, 48)).toBeUndefined();
    expect(resolvePlayerGesture(18, 38)).toBeUndefined();
  });
});
