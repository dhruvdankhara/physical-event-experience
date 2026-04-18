"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

type AlertItem = {
  _id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  audience: "ALL" | "ATTENDEE" | "STAFF";
  active: boolean;
  createdAt: string;
};

type AlertsResponse = {
  alerts: AlertItem[];
};

function severityClass(severity: AlertSeverity) {
  if (severity === "CRITICAL") {
    return "border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-300";
  }

  if (severity === "WARNING") {
    return "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }

  return "border-cyan-500/40 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300";
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

async function fetchAlerts() {
  const response = await fetch("/api/alerts", { method: "GET" });

  if (!response.ok) {
    throw new Error("Failed to fetch alerts.");
  }

  return (await response.json()) as AlertsResponse;
}

function AlertCards({
  alerts,
  emptyDescription,
}: {
  alerts: AlertItem[];
  emptyDescription?: string;
}) {
  if (alerts.length === 0) {
    if (!emptyDescription) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>No alerts</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {alerts.map((alert) => (
        <Card key={alert._id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <Badge variant="outline" className={severityClass(alert.severity)}>
                {alert.severity}
              </Badge>
              <Badge variant="outline">{label(alert.audience)}</Badge>
              {!alert.active && <Badge variant="secondary">Archived</Badge>}
            </div>
            <CardDescription>
              {new Date(alert.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{alert.message}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function AlertsFeed() {
  const [tab, setTab] = useState("active");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["alerts", "feed"],
    queryFn: fetchAlerts,
    refetchInterval: 15_000,
  });

  const filteredAlerts = useMemo(() => {
    const alerts = data?.alerts ?? [];

    if (tab === "active") {
      return alerts.filter((alert) => alert.active);
    }

    return alerts;
  }, [data?.alerts, tab]);

  const liveRegionMessage =
    tab === "active"
      ? `${filteredAlerts.length} active alerts loaded.`
      : `${filteredAlerts.length} alerts loaded.`;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts unavailable</CardTitle>
          <CardDescription>
            The notification feed could not be loaded right now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="sr-only" aria-live="polite">
        {liveRegionMessage}
      </div>

      <TabsList variant="line">
        <TabsTrigger value="active">Active Alerts</TabsTrigger>
        <TabsTrigger value="all">All Alerts</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-3">
        <AlertCards
          alerts={filteredAlerts}
          emptyDescription="There are currently no active stadium-wide announcements."
        />
      </TabsContent>

      <TabsContent value="all" className="space-y-3">
        <AlertCards
          alerts={filteredAlerts}
          emptyDescription="No historical alerts are available yet."
        />
      </TabsContent>
    </Tabs>
  );
}
