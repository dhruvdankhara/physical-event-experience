/**
 * Barrel for Google Cloud platform APIs (Vertex, Analytics, TTS, ADC auth, OAuth state).
 * Passport-based web OAuth stays in `./passport` — import that module only from auth routes.
 */

export * from "./analytics";
export * from "./auth";
export * from "./oauth-routing";
export * from "./tts";
export * from "./vertex";
