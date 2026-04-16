import { GoogleAuth } from "google-auth-library";

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const googleAuth = new GoogleAuth({ scopes: [GOOGLE_SCOPE] });

export type GoogleProjectConfig = {
  projectId: string;
  location: string;
  vertexModel: string;
};

export function getGoogleProjectConfig(): GoogleProjectConfig {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT_ID is required for server-side Google APIs.",
    );
  }

  return {
    projectId,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
    vertexModel: process.env.GOOGLE_VERTEX_MODEL ?? "gemini-2.0-flash-001",
  };
}

export async function getGoogleAccessToken() {
  const client = await googleAuth.getClient();
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error("Unable to resolve a Google Cloud access token.");
  }

  return token.token;
}
