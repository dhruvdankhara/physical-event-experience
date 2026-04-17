export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatProvider = "vertex" | "local-fallback";

export type ChatRequest = {
  message: string;
  history?: ChatMessage[];
};

export type ChatResponse = {
  generatedAt: string;
  generatedBy: string;
  provider: ChatProvider;
  warning?: string;
  answer: string;
  followUps: string[];
};
