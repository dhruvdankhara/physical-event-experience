"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CornerDownLeft,
  SendHorizonal,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatProvider, ChatResponse } from "@/types/chat";

type TranscriptMessage = ChatMessage & {
  id: string;
};

const INITIAL_MESSAGE: TranscriptMessage = {
  id: "assistant-intro",
  role: "assistant",
  content:
    "Hi, I am your Stadium Sync assistant. Ask about queues, routing, amenities, alerts, or live operations support.",
};

function createMessage(
  role: ChatMessage["role"],
  content: string,
): TranscriptMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

function toHistory(messages: TranscriptMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export function ChatAssistant() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provider, setProvider] = useState<ChatProvider | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSubmitting]);

  const sendMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    const history = toHistory(messages.slice(-10));
    setError(null);
    setWarning(null);
    setDraft("");

    setMessages((current) => [...current, createMessage("user", trimmed)]);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      const payload = (await response.json()) as Partial<ChatResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to get assistant response.");
      }

      const answer = payload.answer;
      const responseProvider = payload.provider;

      if (
        typeof answer !== "string" ||
        (responseProvider !== "vertex" && responseProvider !== "local-fallback")
      ) {
        throw new Error("Unexpected chat response payload.");
      }

      const normalizedFollowUps = Array.isArray(payload.followUps)
        ? payload.followUps
        : [];

      setProvider(responseProvider);
      setWarning(payload.warning ?? null);
      setFollowUps(normalizedFollowUps.slice(0, 3));
      setMessages((current) => [
        ...current,
        createMessage("assistant", answer),
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to get assistant response.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const userQuestionCount = messages.filter(
    (message) => message.role === "user",
  ).length;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-card to-card">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              AI Concierge
            </Badge>
            <CardTitle className="font-heading text-2xl sm:text-3xl">
              Ask natural questions and get event-ready guidance in seconds.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
              The assistant can interpret queue pressure, help with route
              choices, and surface practical next steps for attendees and
              stadium staff.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>
              Current state of the assistant experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Questions asked</span>
              <Badge variant="outline">{userQuestionCount}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Response provider</span>
              <Badge
                variant={
                  provider === "local-fallback" ? "secondary" : "outline"
                }
              >
                {provider === "local-fallback"
                  ? "Local fallback"
                  : provider === "vertex"
                    ? "Vertex AI"
                    : "Ready"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="sr-only" aria-live="polite">
            {isSubmitting
              ? "Assistant is generating a response."
              : `Conversation contains ${messages.length} messages.`}
          </div>

          <ScrollArea className="h-96 rounded-2xl border border-border/70 bg-muted/20">
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="space-y-3 p-4"
            >
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isAssistant ? "justify-start" : "justify-end",
                    )}
                  >
                    <article
                      className={cn(
                        "max-w-[90%] rounded-2xl border px-3 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[80%]",
                        isAssistant
                          ? "border-border/80 bg-card"
                          : "border-primary/40 bg-primary/10",
                      )}
                    >
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        {isAssistant ? (
                          <>
                            <Bot className="size-3.5" />
                            Assistant
                          </>
                        ) : (
                          <>
                            <UserCircle2 className="size-3.5" />
                            You
                          </>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </article>
                  </div>
                );
              })}

              {isSubmitting && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm text-muted-foreground">
                    <Spinner />
                    Assistant is thinking...
                  </div>
                </div>
              )}

              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>

          {warning && (
            <div
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
            >
              {warning}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <label htmlFor="chat-draft" className="sr-only">
              Ask Stadium Sync a question
            </label>
            <Textarea
              id="chat-draft"
              aria-describedby="chat-draft-hint"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              className="min-h-26"
              placeholder="Ask about wait times, directions to a section, nearby amenities, or live alerts..."
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p
                id="chat-draft-hint"
                className="inline-flex items-center gap-1.5"
              >
                <CornerDownLeft className="size-3.5" />
                Press Enter to send, Shift+Enter for a new line.
              </p>
              <p>{draft.trim().length}/1000</p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || draft.trim().length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendHorizonal />
                    Ask Assistant
                  </>
                )}
              </Button>
            </div>
          </form>

          {followUps.length > 0 && (
            <section className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5" />
                Suggested follow-ups
              </p>
              <div className="flex flex-wrap gap-2">
                {followUps.map((prompt, index) => (
                  <Button
                    key={`${prompt}-${index}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void sendMessage(prompt);
                    }}
                    disabled={isSubmitting}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
