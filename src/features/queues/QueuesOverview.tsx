"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPOIs,
  POIS_QUERY_KEY,
  type POIResponseItem,
} from "@/features/map/poi-data";
import { useRealTimeWaitTimes } from "@/hooks/useRealTimeWaitTimes";
import { useQuery } from "@tanstack/react-query";

function statusClass(status: POIResponseItem["status"]) {
  if (status === "OPEN") {
    return "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "AT_CAPACITY") {
    return "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

function labelFromType(value: string) {
  return value.replaceAll("_", " ");
}

export function QueuesOverview() {
  useRealTimeWaitTimes();

  const {
    data: pois = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: POIS_QUERY_KEY,
    queryFn: fetchPOIs,
  });

  const queueSummary = useMemo(() => {
    const openCount = pois.filter((poi) => poi.status === "OPEN").length;
    const atCapacityCount = pois.filter(
      (poi) => poi.status === "AT_CAPACITY",
    ).length;
    const closedCount = pois.filter((poi) => poi.status === "CLOSED").length;

    const totalWait = pois.reduce(
      (total, poi) => total + poi.currentWaitTime,
      0,
    );
    const avgWait = pois.length > 0 ? Math.round(totalWait / pois.length) : 0;

    const busiest = [...pois]
      .sort((left, right) => right.currentWaitTime - left.currentWaitTime)
      .slice(0, 12);

    return {
      openCount,
      atCapacityCount,
      closedCount,
      avgWait,
      busiest,
    };
  }, [pois]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue feed unavailable</CardTitle>
          <CardDescription>
            We were unable to load live queue data from the POI service.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Wait</CardDescription>
            <CardTitle className="text-3xl">
              {queueSummary.avgWait} min
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Computed across all active POIs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Queues</CardDescription>
            <CardTitle className="text-3xl">{queueSummary.openCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Serving fans right now.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>At Capacity</CardDescription>
            <CardTitle className="text-3xl">
              {queueSummary.atCapacityCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Requires flow intervention.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed</CardDescription>
            <CardTitle className="text-3xl">
              {queueSummary.closedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Currently unavailable to attendees.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Queue Priorities</CardTitle>
          <CardDescription>
            Highest wait-time locations in descending order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>POI</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Wait</TableHead>
                <TableHead>Pressure</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueSummary.busiest.map((poi) => {
                const pressurePercent = Math.min(
                  100,
                  Math.round((poi.currentWaitTime / 40) * 100),
                );

                return (
                  <TableRow key={poi._id}>
                    <TableCell className="font-medium">{poi.name}</TableCell>
                    <TableCell>{labelFromType(poi.type)}</TableCell>
                    <TableCell>{poi.currentWaitTime} min</TableCell>
                    <TableCell>
                      <div className="w-40 max-w-full space-y-1">
                        <Progress value={pressurePercent} />
                        <p className="text-[11px] text-muted-foreground">
                          {pressurePercent}% pressure
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusClass(poi.status)}
                      >
                        {labelFromType(poi.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
