import { google } from "googleapis";
import { ENV } from "./_core/env";
import { saveYouTubeIntegration, saveDriveIntegration } from "./db";

const oauth2Client = new google.auth.OAuth2(
  ENV.googleDriveClientId,
  ENV.googleDriveClientSecret,
  `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/api/oauth/callback`
);

// Generate OAuth URL for YouTube
export function getYouTubeOAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

// Generate OAuth URL for Google Drive
export function getDriveOAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

// Handle OAuth callback for YouTube
export async function handleYouTubeCallback(code: string, userId: number) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Save the integration
    await saveYouTubeIntegration({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    return { success: true };
  } catch (error) {
    console.error("[YouTube OAuth] Error:", error);
    throw error;
  }
}

// Handle OAuth callback for Google Drive
export async function handleDriveCallback(code: string, userId: number) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Save the integration
    await saveDriveIntegration({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    return { success: true };
  } catch (error) {
    console.error("[Drive OAuth] Error:", error);
    throw error;
  }
}
