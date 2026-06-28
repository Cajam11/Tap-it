"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Music2,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GymMusicPlaySession, GymMusicVoteValue } from "@/lib/types";

type SpotifyTrackSummary = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number | null;
};

type MusicPayload = {
  connected: boolean;
  reconnectRequired: boolean;
  current: GymMusicPlaySession | null;
  voteCounts: {
    like: number;
    dislike: number;
  };
  userVote: GymMusicVoteValue | null;
  message?: string;
};

type VoteCountRow = {
  play_session_id: string;
  like_count: number;
  dislike_count: number;
};

function formatDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function trackArtists(artists: string[]) {
  return artists.length ? artists.join(", ") : "Spotify";
}

export default function GymMusicWidget() {
  const supabase = useMemo(() => createClient(), []);
  const [music, setMusic] = useState<MusicPayload | null>(null);
  const [loadedAt, setLoadedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState<GymMusicVoteValue | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const current = music?.current ?? null;
  const progressMs = useMemo(() => {
    if (!current) {
      return 0;
    }

    const base = current.progress_ms ?? 0;
    const elapsed = current.is_playing ? now - loadedAt : 0;
    return Math.min(current.duration_ms ?? base + elapsed, base + elapsed);
  }, [current, loadedAt, now]);

  const loadMusic = useCallback(async () => {
    const response = await fetch("/api/music/current", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("music_load_failed");
    }

    const data = (await response.json()) as MusicPayload;
    setMusic(data);
    setLoadedAt(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadMusic();
      } catch {
        if (!cancelled) {
          setNotice("Hudba teraz nie je dostupna.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    const ticker = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
    };
  }, [loadMusic]);

  useEffect(() => {
    const channel = supabase
      .channel("landing-gym-music")
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
            setMusic((prev) =>
              prev
                ? {
                    ...prev,
                    current: next,
                  }
                : prev,
            );
            setLoadedAt(Date.now());
            return;
          }

          if (old?.id && old.id === current?.id) {
            setMusic((prev) =>
              prev
                ? {
                    ...prev,
                    current: null,
                    voteCounts: { like: 0, dislike: 0 },
                    userVote: null,
                  }
                : prev,
            );
            setLoadedAt(Date.now());
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
            if (!prev?.current || prev.current.id !== row.play_session_id) {
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [current?.id, loadMusic, supabase]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        const response = await fetch(`/api/music/search?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("search_failed");
        }

        const data = (await response.json()) as {
          tracks?: SpotifyTrackSummary[];
        };
        if (!cancelled) {
          setResults(data.tracks ?? []);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setNotice("Vyhladavanie teraz nie je dostupne.");
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  async function vote(nextVote: GymMusicVoteValue) {
    if (!current) {
      return;
    }

    const voteValue = music?.userVote === nextVote ? null : nextVote;
    setIsVoting(nextVote);
    setNotice(null);

    try {
      const response = await fetch("/api/music/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playSessionId: current.id,
          vote: voteValue,
        }),
      });

      if (!response.ok) {
        throw new Error("vote_failed");
      }

      const summary = (await response.json()) as Pick<
        MusicPayload,
        "voteCounts" | "userVote"
      >;
      setMusic((prev) =>
        prev
          ? {
              ...prev,
              voteCounts: summary.voteCounts,
              userVote: summary.userVote,
            }
          : prev,
      );
    } catch {
      setNotice("Hlas sa nepodarilo ulozit.");
    } finally {
      setIsVoting(null);
    }
  }

  async function suggest(trackId: string) {
    setSuggestingId(trackId);
    setNotice(null);

    try {
      const response = await fetch("/api/music/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        throw new Error("suggest_failed");
      }

      setNotice("Navrh je odoslany.");
      setQuery("");
      setResults([]);
    } catch {
      setNotice("Navrh sa nepodarilo odoslat.");
    } finally {
      setSuggestingId(null);
    }
  }

  const progressPercent =
    current?.duration_ms && current.duration_ms > 0
      ? Math.min(100, Math.max(0, (progressMs / current.duration_ms) * 100))
      : 0;

  return (
    <section
      className="px-4 pb-28 lg:px-8"
      aria-labelledby="music-heading"
      style={{ background: "linear-gradient(180deg, #080808, #0c0c0c)" }}
    >
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6 lg:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/15 text-red-400">
              <Music2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="music-heading" className="text-lg font-bold text-white">
                Prave hra
              </h2>
              <p className="text-sm text-white/45">Hlasuj alebo navrhni dalsi track</p>
            </div>
          </div>
          {current?.is_playing ? (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Live
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Nacitavam hudbu
          </div>
        ) : !music?.connected || music.reconnectRequired ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">
            Hudba teraz nie je dostupna.
          </div>
        ) : !current ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">
            Spotify je pripojeny, ale momentalne nic nehra.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex min-w-0 gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:h-32 sm:w-32">
                {current.album_image_url ? (
                  <Image
                    src={current.album_image_url}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/30">
                    <Music2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-white sm:text-2xl">
                  {current.track_name}
                </p>
                <p className="mt-1 truncate text-sm text-white/55">
                  {trackArtists(current.artist_names)}
                </p>
                <div className="mt-5">
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
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void vote("like")}
                    disabled={Boolean(isVoting)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      music.userVote === "like"
                        ? "bg-emerald-500 text-white"
                        : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white"
                    }`}
                  >
                    {isVoting === "like" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4" />
                    )}
                    {music.voteCounts.like}
                  </button>
                  <button
                    type="button"
                    onClick={() => void vote("dislike")}
                    disabled={Boolean(isVoting)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      music.userVote === "dislike"
                        ? "bg-red-600 text-white"
                        : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white"
                    }`}
                  >
                    {isVoting === "dislike" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsDown className="h-4 w-4" />
                    )}
                    {music.voteCounts.dislike}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Navrhni pesnicku"
                  className="h-11 w-full rounded-full border border-white/10 bg-black/25 pl-10 pr-10 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-red-500/60"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
                ) : null}
              </div>

              {results.length > 0 ? (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {results.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-2.5"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        {track.albumImageUrl ? (
                          <Image
                            src={track.albumImageUrl}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {track.name}
                        </p>
                        <p className="truncate text-xs text-white/45">
                          {trackArtists(track.artists)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void suggest(track.id)}
                        disabled={suggestingId === track.id}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500 disabled:cursor-wait disabled:bg-red-600/60"
                        aria-label="Odoslat navrh"
                      >
                        {suggestingId === track.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {notice ? (
                <p className="mt-3 text-sm text-white/45">{notice}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
