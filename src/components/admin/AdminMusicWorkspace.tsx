"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  GymMusicPlaySession,
  GymMusicSuggestion,
  GymMusicSuggestionStatus,
  UserRole,
} from "@/lib/types";

type MusicVoteCounts = {
  like: number;
  dislike: number;
};

type SpotifyConnectionStatus = {
  spotify_user_id: string | null;
  spotify_display_name: string | null;
  connected_at: string;
  refresh_token_expires_at: string;
  last_token_error: string | null;
};

type MusicCurrentPayload = {
  connected: boolean;
  reconnectRequired: boolean;
  connection: SpotifyConnectionStatus | null;
  current: GymMusicPlaySession | null;
  voteCounts: MusicVoteCounts;
};

type SuggestionWithProfile = GymMusicSuggestion & {
  suggested_by_name: string | null;
  suggested_by_email: string | null;
};

type VoteCountRow = {
  play_session_id: string;
  like_count: number;
  dislike_count: number;
};

type AdminMusicWorkspaceProps = {
  currentRole: UserRole;
  music: MusicCurrentPayload;
  suggestions: SuggestionWithProfile[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(ms: number | null) {
  if (!ms) {
    return "";
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function artists(value: string[]) {
  return value.length ? value.join(", ") : "Spotify";
}

function statusClass(status: GymMusicSuggestionStatus) {
  if (status === "queued") {
    return "bg-emerald-500/15 text-emerald-300";
  }

  if (status === "failed") {
    return "bg-amber-500/15 text-amber-300";
  }

  if (status === "rejected") {
    return "bg-red-500/15 text-red-300";
  }

  return "bg-white/10 text-white/60";
}

export default function AdminMusicWorkspace({
  currentRole,
  music: initialMusic,
  suggestions: initialSuggestions,
}: AdminMusicWorkspaceProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [music, setMusic] = useState(initialMusic);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const isOwner = currentRole === "owner";
  const current = music.current;
  const progressMs = useMemo(() => {
    if (!current) {
      return 0;
    }

    const base = current.progress_ms ?? 0;
    const elapsed = current.is_playing ? now - loadedAt : 0;
    return Math.min(current.duration_ms ?? base + elapsed, base + elapsed);
  }, [current, loadedAt, now]);
  const progressPercent =
    current?.duration_ms && current.duration_ms > 0
      ? Math.min(100, Math.max(0, (progressMs / current.duration_ms) * 100))
      : 0;

  useEffect(() => {
    setMusic(initialMusic);
    setLoadedAt(Date.now());
  }, [initialMusic]);

  useEffect(() => {
    setSuggestions(initialSuggestions);
  }, [initialSuggestions]);

  const syncCurrentMusic = useCallback(async () => {
    if (document.hidden) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/music/current?force=1", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("music_sync_failed");
      }

      const nextMusic = (await response.json()) as MusicCurrentPayload;
      setMusic(nextMusic);
      setLoadedAt(Date.now());
    } catch {
      setError("Live sync hudby teraz zlyhal.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refreshSuggestions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/music/suggestions", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("suggestions_refresh_failed");
      }

      const body = (await response.json()) as {
        suggestions?: SuggestionWithProfile[];
      };
      setSuggestions(body.suggestions ?? []);
    } catch {
      setError("Realtime navrhy sa teraz nepodarilo obnovit.");
    }
  }, []);

  useEffect(() => {
    void syncCurrentMusic();
  }, [syncCurrentMusic]);

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (!current?.duration_ms || !current.is_playing) {
      return;
    }

    const remainingMs = Math.max(
      1200,
      current.duration_ms - (current.progress_ms ?? 0) + 1500,
    );
    const timeout = window.setTimeout(() => {
      void syncCurrentMusic();
    }, remainingMs);

    return () => window.clearTimeout(timeout);
  }, [
    current?.id,
    current?.duration_ms,
    current?.is_playing,
    current?.progress_ms,
    syncCurrentMusic,
  ]);

  useEffect(() => {
    const syncOnFocus = () => {
      if (!document.hidden) {
        void syncCurrentMusic();
      }
    };

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnFocus);

    return () => {
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnFocus);
    };
  }, [syncCurrentMusic]);

  function mergeSuggestion(updated: GymMusicSuggestion) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === updated.id
          ? {
              ...suggestion,
              ...updated,
              suggested_by_name: suggestion.suggested_by_name,
              suggested_by_email: suggestion.suggested_by_email,
            }
          : suggestion,
      ),
    );
  }

  useEffect(() => {
    const channel = supabase
      .channel("admin-gym-music")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_music_play_sessions",
        },
        (payload) => {
          const next = payload.new as GymMusicPlaySession | null;
          const old = payload.old as Partial<GymMusicPlaySession> | null;

          if (next?.id && next.ended_at === null) {
            setMusic((prev) => ({
              ...prev,
              current: next,
            }));
            setLoadedAt(Date.now());
            return;
          }

          if (old?.id && old.id === current?.id) {
            void syncCurrentMusic();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_music_vote_counts",
        },
        (payload) => {
          const row = payload.new as VoteCountRow | null;
          if (!row?.play_session_id) {
            return;
          }

          setMusic((prev) => {
            if (!prev.current || prev.current.id !== row.play_session_id) {
              return prev;
            }

            return {
              ...prev,
              voteCounts: {
                like: Math.max(0, row.like_count ?? 0),
                dislike: Math.max(0, row.dislike_count ?? 0),
              },
            };
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_music_suggestions",
        },
        (payload) => {
          void refreshSuggestions();
          const next = payload.new as GymMusicSuggestion | null;
          const old = payload.old as Partial<GymMusicSuggestion> | null;

          if (payload.eventType === "DELETE" && old?.id) {
            setSuggestions((currentSuggestions) =>
              currentSuggestions.filter((suggestion) => suggestion.id !== old.id),
            );
            return;
          }

          if (!next?.id) {
            return;
          }

          setSuggestions((currentSuggestions) => {
            const existing = currentSuggestions.find(
              (suggestion) => suggestion.id === next.id,
            );

            if (!existing) {
              return [
                {
                  ...next,
                  suggested_by_name: null,
                  suggested_by_email: null,
                },
                ...currentSuggestions,
              ];
            }

            return currentSuggestions.map((suggestion) =>
              suggestion.id === next.id
                ? {
                    ...suggestion,
                    ...next,
                  }
                : suggestion,
            );
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [current?.id, refreshSuggestions, supabase, syncCurrentMusic]);

  async function act(suggestionId: string, action: "queue" | "reject") {
    setBusyId(`${action}:${suggestionId}`);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/music/suggestions/${suggestionId}/${action}`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("action_failed");
      }

      const body = (await response.json()) as {
        suggestion?: GymMusicSuggestion;
      };

      if (body.suggestion) {
        mergeSuggestion(body.suggestion);
      }

      if (action === "queue") {
        void syncCurrentMusic();
      }

      router.refresh();
    } catch {
      setError("Akcia sa nepodarila. Skus to znova.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Music</h1>
          <p className="mt-2 text-white/60">
            Spotify playback, voting and member suggestions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/50">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Realtime
          </span>
          {isOwner ? (
            <Link
              href="/api/admin/music/spotify/connect"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <RefreshCw className="h-4 w-4" />
              {music.connected ? "Reconnect Spotify" : "Connect Spotify"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 md:shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-white/50">Spotify status</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                music.connected && !music.reconnectRequired
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              }`}
            />
            <p className="font-semibold text-white">
              {music.connected
                ? music.reconnectRequired
                  ? "Reconnect required"
                  : "Connected"
                : "Not connected"}
            </p>
          </div>
          {music.connection ? (
            <div className="mt-4 space-y-1 text-sm text-white/45">
              <p>{music.connection.spotify_display_name || "Company account"}</p>
              <p>Expires {formatDate(music.connection.refresh_token_expires_at)}</p>
              {music.connection.last_token_error ? (
                <p className="text-amber-300">{music.connection.last_token_error}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/45">
              Owner must connect the company Spotify Premium account.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
          <p className="text-sm text-white/50">Current track</p>
          {current ? (
            <div className="mt-4 flex gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                {current.album_image_url ? (
                  <Image
                    src={current.album_image_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/30">
                    <Music2 className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-semibold text-white">
                  {current.track_name}
                </p>
                <p className="mt-1 truncate text-sm text-white/50">
                  {artists(current.artist_names)}
                </p>
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-500 transition-[width] duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs tabular-nums text-white/35">
                    <span>{formatDuration(progressMs)}</span>
                    <span>{formatDuration(current.duration_ms)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {music.voteCounts.like} likes
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {music.voteCounts.dislike} dislikes
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {current.device_name || "No device"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Synced {formatDate(current.last_synced_at)}
                  </span>
                  {current.device_is_restricted ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">
                      Restricted device
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/45">
              No current Spotify track is available.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 md:shrink-0">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] md:min-h-0 md:flex-1 md:overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:shrink-0">
          <div>
            <h2 className="font-semibold text-white">Suggestions</h2>
            <p className="text-sm text-white/45">
              Queue approved tracks to the active Spotify device.
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/60">
            {suggestions.filter((item) => item.status === "pending").length} pending
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/45 md:flex md:min-h-0 md:flex-1 md:items-center md:justify-center">
            No suggestions yet.
          </div>
        ) : (
          <div className="divide-y divide-white/10 md:min-h-0 md:flex-1 md:overflow-y-auto">
            {suggestions.map((suggestion) => {
              const canAct =
                suggestion.status === "pending" || suggestion.status === "failed";

              return (
                <div
                  key={suggestion.id}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto]"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                      {suggestion.album_image_url ? (
                        <Image
                          src={suggestion.album_image_url}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-white">
                          {suggestion.track_name}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                            suggestion.status,
                          )}`}
                        >
                          {suggestion.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-white/50">
                        {artists(suggestion.artist_names)}
                        {suggestion.duration_ms
                          ? ` - ${formatDuration(suggestion.duration_ms)}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {suggestion.suggested_by_name ||
                          suggestion.suggested_by_email ||
                          "Member"}{" "}
                        - {formatDate(suggestion.created_at)}
                      </p>
                      {suggestion.queue_error ? (
                        <p className="mt-2 text-xs text-amber-300">
                          {suggestion.queue_error}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    {suggestion.status === "queued" ? (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Queued
                      </span>
                    ) : null}
                    {canAct ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void act(suggestion.id, "queue")}
                          disabled={busyId !== null}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-wait disabled:bg-red-600/60"
                        >
                          {busyId === `queue:${suggestion.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Queue
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(suggestion.id, "reject")}
                          disabled={busyId !== null}
                          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white disabled:cursor-wait"
                        >
                          {busyId === `reject:${suggestion.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
