import { Bot, MapPinned, Megaphone, TimerReset } from "lucide-react";
import Link from "next/link";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURE_CARDS = [
  {
    title: "Live Routing",
    description:
      "Guide fans from gate to seat while congestion shifts in real time.",
    icon: MapPinned,
  },
  {
    title: "Queue Intelligence",
    description:
      "Track restroom and concession wait pressure with streaming updates.",
    icon: TimerReset,
  },
  {
    title: "Broadcast Alerts",
    description:
      "Issue stadium-wide advisories through one operational control panel.",
    icon: Megaphone,
  },
  {
    title: "Vertex Insights",
    description:
      "Generate intervention recommendations from live operational snapshots.",
    icon: Bot,
  },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-card to-card">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Stadium Operations Platform
            </Badge>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Physical Event Experience for 50K+ live attendees.
            </h1>
            <CardDescription className="max-w-2xl text-base">
              Stadium Sync unifies map navigation, wait-time telemetry, alerts,
              and Google Cloud intelligence into one fast mobile-first workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/dashboard">Open Live Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">Create Account</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Status</CardTitle>
            <CardDescription>
              Core modules available for attendee and operations teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Google Maps</span>
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Real-time Queue Stream</span>
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Google TTS</span>
              <Badge variant="outline">Admin</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span>Vertex AI Insights</span>
              <Badge variant="outline">Admin</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="size-4 text-primary" />
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>
    </SiteShell>
  );
}
