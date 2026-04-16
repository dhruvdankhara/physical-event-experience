"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VertexResponse = {
  generatedAt: string;
  provider?: "vertex" | "local-fallback";
  warning?: string;
  insights: {
    summary: string;
    hotspots: string[];
    recommendations: string[];
    confidence?: number;
  };
};

export function AdminConsole() {
  const [opsMessage, setOpsMessage] = useState<string | null>(null);
  const [opsBusy, setOpsBusy] = useState(false);

  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<
    "INFO" | "WARNING" | "CRITICAL"
  >("WARNING");
  const [alertBusy, setAlertBusy] = useState(false);

  const [ttsText, setTtsText] = useState(
    "Please use Gate 4 to avoid congestion near the west stand.",
  );
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsUrl, setTtsUrl] = useState<string | null>(null);

  const [vertexBusy, setVertexBusy] = useState(false);
  const [vertexData, setVertexData] = useState<VertexResponse | null>(null);
  const [vertexError, setVertexError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (ttsUrl) {
        URL.revokeObjectURL(ttsUrl);
      }
    };
  }, [ttsUrl]);

  const confidencePercent = useMemo(() => {
    if (!vertexData?.insights.confidence) {
      return null;
    }

    return Math.round(vertexData.insights.confidence * 100);
  }, [vertexData]);

  const runOperation = async (url: string) => {
    setOpsBusy(true);
    setOpsMessage(null);

    try {
      const response = await fetch(url, { method: "GET" });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Operation failed.");
      }

      setOpsMessage(payload.message ?? "Operation completed.");
    } catch (error) {
      setOpsMessage(
        error instanceof Error ? error.message : "Operation failed.",
      );
    } finally {
      setOpsBusy(false);
    }
  };

  const handleCreateAlert = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlertBusy(true);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          severity: alertSeverity,
          audience: "ALL",
          active: true,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create alert.");
      }

      setOpsMessage(payload.message ?? "Alert created.");
      setAlertTitle("");
      setAlertMessage("");
    } catch (error) {
      setOpsMessage(
        error instanceof Error ? error.message : "Failed to create alert.",
      );
    } finally {
      setAlertBusy(false);
    }
  };

  const handleTTS = async () => {
    setTtsBusy(true);
    setOpsMessage(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: ttsText }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "TTS generation failed.");
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);

      if (ttsUrl) {
        URL.revokeObjectURL(ttsUrl);
      }

      setTtsUrl(nextUrl);
      setOpsMessage("TTS audio generated.");
    } catch (error) {
      setOpsMessage(
        error instanceof Error ? error.message : "TTS generation failed.",
      );
    } finally {
      setTtsBusy(false);
    }
  };

  const handleVertex = async () => {
    setVertexBusy(true);
    setVertexError(null);

    try {
      const response = await fetch("/api/vertex/wait-times", {
        method: "POST",
      });

      const payload = (await response.json()) as VertexResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Vertex analysis failed.");
      }

      setVertexData(payload);
    } catch (error) {
      setVertexError(
        error instanceof Error ? error.message : "Vertex analysis failed.",
      );
    } finally {
      setVertexBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Operations Controls</CardTitle>
          <CardDescription>
            Staff-only simulation tools for queue pressure drills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runOperation("/api/seed")}
              disabled={opsBusy}
            >
              Seed Stadium POIs
            </Button>
            <Button
              variant="outline"
              onClick={() => runOperation("/api/trigger-rush")}
              disabled={opsBusy}
            >
              Trigger Rush Event
            </Button>
          </div>
          {opsMessage && (
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm">
              {opsMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Alert</CardTitle>
          <CardDescription>
            Publish a real-time announcement to the stadium feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleCreateAlert}>
            <div className="space-y-1.5">
              <Label htmlFor="alert-title">Title</Label>
              <Input
                id="alert-title"
                value={alertTitle}
                onChange={(event) => setAlertTitle(event.target.value)}
                placeholder="Weather Delay Advisory"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert-message">Message</Label>
              <Textarea
                id="alert-message"
                value={alertMessage}
                onChange={(event) => setAlertMessage(event.target.value)}
                rows={4}
                placeholder="Please seek shelter in the nearest concourse area."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert-severity">Severity</Label>
              <select
                id="alert-severity"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={alertSeverity}
                onChange={(event) =>
                  setAlertSeverity(
                    event.target.value as "INFO" | "WARNING" | "CRITICAL",
                  )
                }
              >
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <Button type="submit" disabled={alertBusy}>
              {alertBusy ? "Creating..." : "Create Alert"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Cloud Text-to-Speech</CardTitle>
          <CardDescription>
            Generate spoken announcements for accessibility and PA handoff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={ttsText}
            onChange={(event) => setTtsText(event.target.value)}
            rows={4}
          />
          <Button onClick={handleTTS} disabled={ttsBusy}>
            {ttsBusy ? "Generating..." : "Generate Announcement Audio"}
          </Button>
          {ttsUrl && <audio controls src={ttsUrl} className="w-full" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vertex Queue Insights</CardTitle>
          <CardDescription>
            Analyze current POI wait-time pressure and recommended
            interventions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleVertex} disabled={vertexBusy}>
            {vertexBusy ? "Analyzing..." : "Run Vertex Analysis"}
          </Button>

          {vertexError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {vertexError}
            </div>
          )}

          {vertexData && (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    vertexData.provider === "local-fallback"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {vertexData.provider === "local-fallback"
                    ? "Local fallback insights"
                    : "Vertex AI insights"}
                </Badge>

                {confidencePercent !== null && (
                  <Badge variant="outline">
                    Confidence: {confidencePercent}%
                  </Badge>
                )}
              </div>

              {vertexData.warning && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  {vertexData.warning}
                </div>
              )}

              <p className="text-sm font-medium">
                {vertexData.insights.summary}
              </p>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hotspots
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {vertexData.insights.hotspots.map((item, index) => (
                    <li key={`${item}-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommendations
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {vertexData.insights.recommendations.map((item, index) => (
                    <li key={`${item}-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
