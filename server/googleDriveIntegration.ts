import { google } from "googleapis";
import { ENV } from "./_core/env";

/**
 * Google Drive API integration for extracting video URLs
 * Supports both public and private files with OAuth authentication
 */

const oauth2Client = new google.auth.OAuth2(
  ENV.googleDriveClientId,
  ENV.googleDriveClientSecret,
  `${process.env.OAUTH_SERVER_URL || "http://localhost:3000"}/api/oauth/callback`
);

export async function extractGoogleDriveVideoUrl(
  fileId: string,
  accessToken?: string
): Promise<string | null> {
  try {
    // If access token provided, use it for private files
    if (accessToken) {
      oauth2Client.setCredentials({ access_token: accessToken });
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get file metadata to check if it's a video
    const fileMetadata = await drive.files.get({
      fileId,
      fields: "mimeType, name, webContentLink, exportLinks",
    });

    const mimeType = fileMetadata.data.mimeType || "";
    const webContentLink = fileMetadata.data.webContentLink;

    // If it's a video file, return the direct download link
    if (mimeType.startsWith("video/")) {
      // For direct video files, use the webContentLink which allows streaming
      return webContentLink || `https://drive.google.com/uc?id=${fileId}&export=download`;
    }

    // If it's a Google Video (Google's proprietary format), try to export as MP4
    if (mimeType === "application/vnd.google-apps.video") {
      const exportLinks = fileMetadata.data.exportLinks;
      if (exportLinks && exportLinks["video/mp4"]) {
        return exportLinks["video/mp4"];
      }
    }

    // Fallback: return direct download URL
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  } catch (error) {
    console.error("[Google Drive] Error extracting video URL:", error);
    return null;
  }
}

/**
 * Parse Google Drive URL and extract file ID
 */
export function parseGoogleDriveUrl(url: string): string | null {
  // Match patterns like:
  // https://drive.google.com/file/d/{fileId}/view
  // https://drive.google.com/open?id={fileId}
  // https://drive.google.com/uc?id={fileId}

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get Google OAuth authorization URL for user consent
 */
export function getGoogleAuthUrl(): string {
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessTokenFromCode(code: string): Promise<string | null> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens.access_token || null;
  } catch (error) {
    console.error("[Google Drive] Error getting access token:", error);
    return null;
  }
}
