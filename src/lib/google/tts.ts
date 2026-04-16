import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const globalForTTS = globalThis as typeof globalThis & {
  __ttsClient?: TextToSpeechClient;
};

function getClient() {
  if (!globalForTTS.__ttsClient) {
    globalForTTS.__ttsClient = new TextToSpeechClient();
  }

  return globalForTTS.__ttsClient;
}

export type TTSInput = {
  text: string;
  languageCode?: string;
  voiceName?: string;
};

export async function synthesizeAnnouncementAudio(input: TTSInput) {
  const languageCode = process.env.GOOGLE_TTS_LANGUAGE_CODE ?? "en-IN";
  const voiceName = process.env.GOOGLE_TTS_VOICE_NAME;

  const [response] = await getClient().synthesizeSpeech({
    input: { text: input.text },
    voice: {
      languageCode: input.languageCode ?? languageCode,
      ...(input.voiceName || voiceName
        ? { name: input.voiceName ?? voiceName }
        : {}),
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1,
    },
  });

  if (!response.audioContent) {
    throw new Error("TTS response did not include audio content.");
  }

  const audioBuffer =
    typeof response.audioContent === "string"
      ? Buffer.from(response.audioContent, "base64")
      : Buffer.from(response.audioContent as Uint8Array);

  return {
    audioBuffer,
    mimeType: "audio/mpeg",
  };
}
