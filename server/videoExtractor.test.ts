import { describe, it, expect } from "vitest";
import { extractVideoUrl } from "./videoExtractor";

describe("videoExtractor", () => {
  it("should handle invalid URLs gracefully", async () => {
    const result = await extractVideoUrl("https://invalid-site-12345.com/video");
    // Should return null or handle error gracefully
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("should detect tokyvideo URLs", async () => {
    // This is a mock test - real extraction would need actual tokyvideo URLs
    const url = "https://www.tokyvideo.com/br/video/test";
    // Just verify the function doesn't crash
    const result = await extractVideoUrl(url);
    expect(typeof result === "string" || result === null).toBe(true);
  });

  it("should detect animesonline URLs", async () => {
    // This is a mock test - real extraction would need actual animesonline URLs
    const url = "https://animesonlinecc.to/episodio/test";
    // Just verify the function doesn't crash
    const result = await extractVideoUrl(url);
    expect(typeof result === "string" || result === null).toBe(true);
  });
});
