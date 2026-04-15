"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPOIs,
  POIS_QUERY_KEY,
  type POIResponseItem,
} from "@/features/map/poi-data";
import {
  clearSelectedPoiId,
  setActiveFilter,
  setSearchTerm,
  type ActiveFilter,
} from "@/store/slices/uiSlice";
import type { AppDispatch, RootState } from "@/store/store";

const FILTER_OPTIONS: Array<{ label: string; value: ActiveFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Food", value: "CONCESSION" },
  { label: "Restrooms", value: "RESTROOM" },
  { label: "Exits", value: "EXIT" },
  { label: "Merch", value: "MERCH" },
  { label: "First Aid", value: "FIRST_AID" },
];

function toLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusClass(status: POIResponseItem["status"]) {
  if (status === "OPEN") {
    return "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "AT_CAPACITY") {
    return "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

export function DashboardOverlay() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeFilter, selectedPoiId, searchTerm } = useSelector(
    (state: RootState) => state.ui,
  );

  const { data: pois = [], isLoading } = useQuery({
    queryKey: POIS_QUERY_KEY,
    queryFn: fetchPOIs,
  });

  const selectedPoi = selectedPoiId
    ? (pois.find((poi) => poi._id === selectedPoiId) ?? null)
    : null;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-lg backdrop-blur-md">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
                <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
                <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
                <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
                <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) =>
                    dispatch(setSearchTerm(event.target.value))
                  }
                  placeholder="Search food, restrooms, exits..."
                  className="h-10 bg-background/85 pl-9 pr-9"
                />
                {searchTerm.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => dispatch(setSearchTerm(""))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FILTER_OPTIONS.map((filterOption) => {
                  const isActive = activeFilter === filterOption.value;

                  return (
                    <Button
                      key={filterOption.value}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="shrink-0"
                      onClick={() =>
                        dispatch(setActiveFilter(filterOption.value))
                      }
                    >
                      {filterOption.label}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Drawer
        open={selectedPoiId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            dispatch(clearSelectedPoiId());
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{selectedPoi?.name ?? "POI details"}</DrawerTitle>
            <DrawerDescription>
              {selectedPoi
                ? `${toLabel(selectedPoi.type)} details and current queue status.`
                : "Loading selected location details..."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6">
            {selectedPoi ? (
              <>
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
                  <p className="text-sm text-muted-foreground">Current wait</p>
                  <Badge className="h-9 rounded-full px-4 text-sm font-semibold">
                    {selectedPoi.currentWaitTime} min
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{toLabel(selectedPoi.type)}</Badge>
                  <Badge
                    variant="outline"
                    className={getStatusClass(selectedPoi.status)}
                  >
                    {toLabel(selectedPoi.status)}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
                Unable to find details for this point of interest.
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
