import { describe, it, expect } from "vitest";

describe("Google Drive API Credentials", () => {
  it("should have valid Google Drive API credentials in environment", () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    // Check that credentials exist
    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();

    // Check that credentials have expected format
    expect(clientId).toContain("apps.googleusercontent.com");
    expect(clientSecret).toMatch(/^GOCSPX-/);

    // Check that credentials are not empty
    expect(clientId?.length).toBeGreaterThan(0);
    expect(clientSecret?.length).toBeGreaterThan(0);
  });
});
