import "server-only";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  GymMusicPlaySession,
  GymMusicSuggestion,
  GymMusicSuggestionStatus,
  GymMusicVoteValue,
} from "@/lib/types";

export const SPOTIFY_SCOPES =
  "user-read-currently-playing user-read-playback-state user-modify-playback-state";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const MUSIC_SYNC_TTL_MS = 15_000;
const SPOTIFY_REFRESH_TOKEN_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;

let cachedAccessToken:
  | {
      refreshToken: string;
      accessToken: string;
      expiresAt: number;
    }
  | null = null;

export type SpotifyTrackSummary = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number | null;
};

export type MusicVoteCounts = {
  like: number;
  dislike: number;
};

export type MusicCurrentPayload = {
  connected: boolean;
  reconnectRequired: boolean;
  connection: SpotifyConnectionStatus | null;
  current: GymMusicPlaySession | null;
  voteCounts: MusicVoteCounts;
  userVote: GymMusicVoteValue | null;
  message?: string;
};

export type SpotifyConnectionStatus = {
  spotify_user_id: string | null;
  spotify_display_name: string | null;
  scopes: string[];
  connected_at: string;
  updated_at: string;
  refresh_token_expires_at: string;
  last_token_error: string | null;
  last_token_error_at: string | null;
};

type SpotifyConnectionRow = SpotifyConnectionStatus & {
  refresh_token: string;
};

type SpotifyTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type SpotifyImage = {
  url?: string;
  height?: number | null;
  width?: number | null;
};

type SpotifyArtist = {
  name?: string;
};

type SpotifyTrack = {
  id?: string;
  uri?: string;
  name?: string;
  duration_ms?: number;
  artists?: SpotifyArtist[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
};

type SpotifyCurrentlyPlaying = {
  device?: {
    id?: string | null;
    is_active?: boolean;
    is_restricted?: boolean;
    name?: string;
    type?: string;
  };
  is_playing?: boolean;
  item?: SpotifyTrack | null;
  progress_ms?: number | null;
  currently_playing_type?: string;
};

type SpotifyDevice = {
  id?: string | null;
  is_active?: boolean;
  is_restricted?: boolean;
  name?: string;
  type?: string;
};

type SpotifyAvailableDevices = {
  devices?: SpotifyDevice[];
};

type SpotifyApiError = {
  error?: {
    status?: number;
    message?: string;
  };
  error_description?: string;
};

type SuggestionWithProfile = GymMusicSuggestion & {
  suggested_by_name: string | null;
  suggested_by_email: string | null;
};

function requireEnv(name: "SPOTIFY_CLIENT_ID" | "SPOTIFY_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env variable`);
  }

  return value;
}

function getStateSecret() {
  const value = process.env.SPOTIFY_STATE_SECRET || process.env.QR_TOKEN_SECRET;
  if (!value) {
    throw new Error("Missing SPOTIFY_STATE_SECRET env variable");
  }

  return value;
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/") + padding,
    "base64",
  ).toString("utf8");
}

function hmac(value: string) {
  return toBase64Url(
    crypto
      .createHmac("sha256", getStateSecret())
      .update(value)
      .digest(),
  );
}

function spotifyBasicAuthHeader() {
  const credentials = Buffer.from(
    `${requireEnv("SPOTIFY_CLIENT_ID")}:${requireEnv("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");

  return `Basic ${credentials}`;
}

function getRedirectUri(requestUrl: string) {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    new URL("/api/admin/music/spotify/callback", requestUrl).toString()
  );
}

function normalizeArtists(artists: SpotifyArtist[] | undefined) {
  return (artists ?? [])
    .map((artist) => artist.name?.trim())
    .filter((name): name is string => Boolean(name));
}

function bestImage(images: SpotifyImage[] | undefined) {
  return images?.[0]?.url ?? null;
}

function normalizeTrack(track: SpotifyTrack): SpotifyTrackSummary | null {
  if (!track.id || !track.uri || !track.name) {
    return null;
  }

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: normalizeArtists(track.artists),
    albumName: track.album?.name ?? null,
    albumImageUrl: bestImage(track.album?.images),
    durationMs:
      typeof track.duration_ms === "number" && track.duration_ms >= 0
        ? track.duration_ms
        : null,
  };
}

function sanitizeSpotifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return String(error).slice(0, 500);
}

function isMissingMusicSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";

  return (
    code === "PGRST202" ||
    code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

async function parseSpotifyError(response: Response) {
  try {
    const body = (await response.json()) as SpotifyApiError;
    return (
      body.error?.message ||
      body.error_description ||
      `Spotify request failed with ${response.status}`
    );
  } catch {
    return `Spotify request failed with ${response.status}`;
  }
}

export function createSpotifyOAuthState(userId: string) {
  const payload = toBase64Url(
    JSON.stringify({
      userId,
      ts: Date.now(),
    }),
  );

  return `${payload}.${hmac(payload)}`;
}

export function verifySpotifyOAuthState(state: string, expectedUserId: string) {
  const [payloadPart, signaturePart] = state.split(".");
  if (!payloadPart || !signaturePart || hmac(payloadPart) !== signaturePart) {
    throw new Error("Invalid Spotify OAuth state.");
  }

  const payload = JSON.parse(fromBase64Url(payloadPart)) as {
    userId?: string;
    ts?: number;
  };

  if (payload.userId !== expectedUserId) {
    throw new Error("Spotify OAuth state belongs to another user.");
  }

  if (
    typeof payload.ts !== "number" ||
    Date.now() - payload.ts > 10 * 60 * 1000
  ) {
    throw new Error("Spotify OAuth state expired.");
  }
}

export function buildSpotifyAuthorizeUrl(requestUrl: string, state: string) {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("client_id", requireEnv("SPOTIFY_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getRedirectUri(requestUrl));
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");
  return url.toString();
}

async function spotifyTokenRequest(params: URLSearchParams) {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: spotifyBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  const body = (await response.json()) as SpotifyTokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(
      body.error_description ||
        body.error ||
        `Spotify token request failed with ${response.status}`,
    );
  }

  return body;
}

export async function completeSpotifyConnection(
  code: string,
  requestUrl: string,
) {
  const token = await spotifyTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(requestUrl),
    }),
  );

  if (!token.refresh_token) {
    throw new Error("Spotify did not return a refresh token.");
  }

  const profileResponse = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    cache: "no-store",
  });

  const profile = profileResponse.ok
    ? ((await profileResponse.json()) as {
        id?: string;
        display_name?: string;
      })
    : null;

  const scopes = token.scope
    ? token.scope.split(" ").filter(Boolean)
    : SPOTIFY_SCOPES.split(" ");

  const admin = createAdminClient();
  const { error } = await admin.rpc("upsert_spotify_connection", {
    p_refresh_token: token.refresh_token,
    p_spotify_user_id: profile?.id ?? null,
    p_spotify_display_name: profile?.display_name ?? null,
    p_scopes: scopes,
    p_refresh_token_expires_at: new Date(
      Date.now() + SPOTIFY_REFRESH_TOKEN_LIFETIME_MS,
    ).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSpotifyConnection() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_spotify_connection");

  if (error) {
    if (isMissingMusicSchemaError(error)) {
      return null;
    }

    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as SpotifyConnectionRow | null;
}

export function toConnectionStatus(
  connection: SpotifyConnectionRow | null,
): SpotifyConnectionStatus | null {
  if (!connection) {
    return null;
  }

  return {
    spotify_user_id: connection.spotify_user_id,
    spotify_display_name: connection.spotify_display_name,
    scopes: Array.isArray(connection.scopes) ? connection.scopes : [],
    connected_at: connection.connected_at,
    updated_at: connection.updated_at,
    refresh_token_expires_at: connection.refresh_token_expires_at,
    last_token_error: connection.last_token_error,
    last_token_error_at: connection.last_token_error_at,
  };
}

export function isSpotifyReconnectRequired(
  connection: SpotifyConnectionRow | null,
) {
  if (!connection) {
    return false;
  }

  const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
  const missingRequiredScope = SPOTIFY_SCOPES.split(" ").some(
    (scope) => !scopes.includes(scope),
  );

  return (
    missingRequiredScope ||
    Boolean(connection.last_token_error) ||
    new Date(connection.refresh_token_expires_at).getTime() <= Date.now()
  );
}

async function getSpotifyAccessToken() {
  const connection = await getSpotifyConnection();
  if (!connection) {
    return {
      accessToken: null,
      connection: null,
      reconnectRequired: false,
      message: "Spotify is not connected.",
    };
  }

  if (isSpotifyReconnectRequired(connection)) {
    return {
      accessToken: null,
      connection,
      reconnectRequired: true,
      message: "Spotify needs to be reconnected.",
    };
  }

  if (
    cachedAccessToken?.refreshToken === connection.refresh_token &&
    cachedAccessToken.expiresAt > Date.now() + 60_000
  ) {
    return {
      accessToken: cachedAccessToken.accessToken,
      connection,
      reconnectRequired: false,
      message: undefined,
    };
  }

  try {
    const token = await spotifyTokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      }),
    );

    if (token.refresh_token) {
      const admin = createAdminClient();
      await admin.rpc("update_spotify_refresh_token", {
        p_refresh_token: token.refresh_token,
      });
    }

    cachedAccessToken = {
      refreshToken: token.refresh_token ?? connection.refresh_token,
      accessToken: token.access_token!,
      expiresAt:
        Date.now() +
        Math.max(60, Number(token.expires_in ?? 3600) - 60) * 1000,
    };

    return {
      accessToken: token.access_token!,
      connection,
      reconnectRequired: false,
      message: undefined,
    };
  } catch (error) {
    const admin = createAdminClient();
    await admin.rpc("record_spotify_token_error", {
      p_error: sanitizeSpotifyError(error),
    });
    cachedAccessToken = null;

    return {
      accessToken: null,
      connection,
      reconnectRequired: true,
      message: "Spotify needs to be reconnected.",
    };
  }
}

async function spotifyJson<T>(path: string, accessToken: string) {
  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response));
  }

  return (await response.json()) as T;
}

async function fetchCurrentlyPlaying(accessToken: string) {
  return spotifyJson<SpotifyCurrentlyPlaying>(
    "/me/player/currently-playing",
    accessToken,
  );
}

async function fetchAvailableDevices(accessToken: string) {
  const result = await spotifyJson<SpotifyAvailableDevices>(
    "/me/player/devices",
    accessToken,
  );

  return result?.devices ?? [];
}

async function transferPlaybackToDevice(accessToken: string, deviceId: string) {
  const response = await fetch(`${SPOTIFY_API_URL}/me/player`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response));
  }
}

async function getQueueTargetDevice(accessToken: string) {
  const devices = await fetchAvailableDevices(accessToken);
  const playableDevices = devices.filter(
    (device) => device.id && !device.is_restricted,
  );

  const activeDevice = playableDevices.find((device) => device.is_active);
  if (activeDevice?.id) {
    return activeDevice;
  }

  const fallbackDevice = playableDevices[0];
  if (fallbackDevice?.id) {
    await transferPlaybackToDevice(accessToken, fallbackDevice.id);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      ...fallbackDevice,
      is_active: true,
    };
  }

  throw new Error(
    "No Spotify device is available. Open Spotify on the reception device, choose the company account, and start playback once.",
  );
}

async function getOpenPlaySession() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gym_music_play_sessions")
    .select("*")
    .is("ended_at", null)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingMusicSchemaError(error)) {
      return null;
    }

    throw new Error(error.message);
  }

  return (data ?? null) as GymMusicPlaySession | null;
}

async function endOpenPlaySessions() {
  const admin = createAdminClient();
  await admin
    .from("gym_music_play_sessions")
    .update({
      ended_at: new Date().toISOString(),
      is_playing: false,
      last_synced_at: new Date().toISOString(),
    })
    .is("ended_at", null);
}

function shouldReuseSession(
  session: GymMusicPlaySession | null,
  track: SpotifyTrackSummary,
  progressMs: number | null,
) {
  if (!session || session.spotify_track_id !== track.id) {
    return false;
  }

  if (progressMs === null || session.progress_ms === null) {
    return true;
  }

  return session.progress_ms <= progressMs + 10_000;
}

function sessionPayloadFromSpotify(
  track: SpotifyTrackSummary,
  playback: SpotifyCurrentlyPlaying,
) {
  const now = new Date();
  const progressMs =
    typeof playback.progress_ms === "number" && playback.progress_ms >= 0
      ? playback.progress_ms
      : null;

  return {
    spotify_track_id: track.id,
    spotify_track_uri: track.uri,
    track_name: track.name,
    artist_names: track.artists,
    album_name: track.albumName,
    album_image_url: track.albumImageUrl,
    duration_ms: track.durationMs,
    progress_ms: progressMs,
    is_playing: Boolean(playback.is_playing),
    spotify_started_at:
      progressMs === null
        ? null
        : new Date(now.getTime() - progressMs).toISOString(),
    device_id: playback.device?.id ?? null,
    device_name: playback.device?.name ?? null,
    device_type: playback.device?.type ?? null,
    device_is_active: Boolean(playback.device?.is_active),
    device_is_restricted: Boolean(playback.device?.is_restricted),
    last_synced_at: now.toISOString(),
  };
}

async function syncCurrentPlayback(force = false) {
  const openSession = await getOpenPlaySession();

  if (
    openSession &&
    !force &&
    Date.now() - new Date(openSession.last_synced_at).getTime() < MUSIC_SYNC_TTL_MS
  ) {
    return openSession;
  }

  const token = await getSpotifyAccessToken();
  if (!token.accessToken) {
    return null;
  }

  const playback = await fetchCurrentlyPlaying(token.accessToken);
  if (
    !playback ||
    playback.currently_playing_type !== "track" ||
    !playback.item
  ) {
    await endOpenPlaySessions();
    return null;
  }

  const track = normalizeTrack(playback.item);
  if (!track) {
    await endOpenPlaySessions();
    return null;
  }

  const admin = createAdminClient();
  const payload = sessionPayloadFromSpotify(track, playback);

  if (shouldReuseSession(openSession, track, payload.progress_ms)) {
    const { data, error } = await admin
      .from("gym_music_play_sessions")
      .update(payload)
      .eq("id", openSession!.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as GymMusicPlaySession;
  }

  await endOpenPlaySessions();

  const { data, error } = await admin
    .from("gym_music_play_sessions")
    .insert({
      ...payload,
      played_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GymMusicPlaySession;
}

async function getVoteSummary(
  playSessionId: string | null,
  userId?: string | null,
) {
  const empty = {
    voteCounts: { like: 0, dislike: 0 },
    userVote: null as GymMusicVoteValue | null,
  };

  if (!playSessionId) {
    return empty;
  }

  const admin = createAdminClient();
  const [{ data: counts, error: countsError }, { data: userVoteRow, error: userVoteError }] =
    await Promise.all([
      admin
        .from("gym_music_vote_counts")
        .select("like_count,dislike_count")
        .eq("play_session_id", playSessionId)
        .maybeSingle(),
      userId
        ? admin
            .from("gym_music_votes")
            .select("vote")
            .eq("play_session_id", playSessionId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (countsError && !isMissingMusicSchemaError(countsError)) {
    throw new Error(countsError.message);
  }

  if (userVoteError && !isMissingMusicSchemaError(userVoteError)) {
    throw new Error(userVoteError.message);
  }

  if (counts && typeof counts === "object") {
    const row = counts as {
      like_count?: number | null;
      dislike_count?: number | null;
    };
    empty.voteCounts = {
      like: Math.max(0, row.like_count ?? 0),
      dislike: Math.max(0, row.dislike_count ?? 0),
    };
  } else {
    const { data, error } = await admin
      .from("gym_music_votes")
      .select("vote")
      .eq("play_session_id", playSessionId);

    if (error) {
      if (isMissingMusicSchemaError(error)) {
        return empty;
      }

      throw new Error(error.message);
    }

    for (const row of (data ?? []) as Array<{ vote: GymMusicVoteValue }>) {
      if (row.vote === "like" || row.vote === "dislike") {
        empty.voteCounts[row.vote] += 1;
      }
    }
  }

  if (
    userVoteRow &&
    typeof userVoteRow === "object" &&
    "vote" in userVoteRow &&
    (userVoteRow.vote === "like" || userVoteRow.vote === "dislike")
  ) {
    empty.userVote = userVoteRow.vote;
  }

  return empty;
}

export async function getCurrentMusic(
  userId?: string | null,
  opts: { force?: boolean } = {},
): Promise<MusicCurrentPayload> {
  const connection = await getSpotifyConnection();

  if (!connection) {
    return {
      connected: false,
      reconnectRequired: false,
      connection: null,
      current: null,
      voteCounts: { like: 0, dislike: 0 },
      userVote: null,
      message: "Spotify is not connected.",
    };
  }

  const reconnectRequired = isSpotifyReconnectRequired(connection);
  const current = reconnectRequired ? await getOpenPlaySession() : await syncCurrentPlayback(opts.force);
  const votes = await getVoteSummary(current?.id ?? null, userId);

  return {
    connected: true,
    reconnectRequired,
    connection: toConnectionStatus(connection),
    current,
    ...votes,
    message: reconnectRequired ? "Spotify needs to be reconnected." : undefined,
  };
}

export async function setMusicVote(
  userId: string,
  playSessionId: string,
  vote: GymMusicVoteValue | null,
) {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("gym_music_play_sessions")
    .select("id")
    .eq("id", playSessionId)
    .is("ended_at", null)
    .maybeSingle();

  if (!session) {
    throw new Error("Current track is no longer active.");
  }

  if (vote === null) {
    await admin
      .from("gym_music_votes")
      .delete()
      .eq("play_session_id", playSessionId)
      .eq("user_id", userId);
  } else {
    const { error } = await admin.from("gym_music_votes").upsert(
      {
        play_session_id: playSessionId,
        user_id: userId,
        vote,
      },
      { onConflict: "play_session_id,user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return getVoteSummary(playSessionId, userId);
}

export async function searchSpotifyTracks(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const token = await getSpotifyAccessToken();
  if (!token.accessToken) {
    throw new Error(token.message || "Spotify is not connected.");
  }

  const params = new URLSearchParams({
    q: normalized,
    type: "track",
    limit: "8",
  });

  const result = await spotifyJson<{
    tracks?: {
      items?: SpotifyTrack[];
    };
  }>(`/search?${params.toString()}`, token.accessToken);

  return (result?.tracks?.items ?? [])
    .map(normalizeTrack)
    .filter((track): track is SpotifyTrackSummary => track !== null);
}

async function getSpotifyTrack(trackId: string) {
  const token = await getSpotifyAccessToken();
  if (!token.accessToken) {
    throw new Error(token.message || "Spotify is not connected.");
  }

  const track = await spotifyJson<SpotifyTrack>(
    `/tracks/${encodeURIComponent(trackId)}`,
    token.accessToken,
  );

  const normalized = track ? normalizeTrack(track) : null;
  if (!normalized) {
    throw new Error("Spotify track was not found.");
  }

  return normalized;
}

export async function createMusicSuggestion(
  userId: string,
  trackId: string,
): Promise<GymMusicSuggestion> {
  const track = await getSpotifyTrack(trackId);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("gym_music_suggestions")
    .insert({
      suggested_by: userId,
      spotify_track_id: track.id,
      spotify_track_uri: track.uri,
      track_name: track.name,
      artist_names: track.artists,
      album_name: track.albumName,
      album_image_url: track.albumImageUrl,
      duration_ms: track.durationMs,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingMusicSchemaError(error)) {
      throw new Error("Music tables are not available.");
    }

    throw new Error(error.message);
  }

  return data as GymMusicSuggestion;
}

async function addSpotifyTrackToQueue(
  uri: string,
  accessToken: string,
  deviceId: string | null,
) {
  const params = new URLSearchParams({ uri });
  if (deviceId) {
    params.set("device_id", deviceId);
  }

  const response = await fetch(
    `${SPOTIFY_API_URL}/me/player/queue?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response));
  }
}

async function updateSuggestionStatus(
  suggestionId: string,
  payload: Partial<GymMusicSuggestion>,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gym_music_suggestions")
    .update(payload)
    .eq("id", suggestionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GymMusicSuggestion;
}

export async function queueMusicSuggestion(
  suggestionId: string,
  adminUserId: string,
) {
  const admin = createAdminClient();
  const { data: suggestion, error } = await admin
    .from("gym_music_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!suggestion) {
    throw new Error("Suggestion was not found.");
  }

  const row = suggestion as GymMusicSuggestion;
  if (row.status === "queued") {
    return row;
  }

  const token = await getSpotifyAccessToken();
  if (!token.accessToken) {
    return updateSuggestionStatus(suggestionId, {
      status: "failed" as GymMusicSuggestionStatus,
      queue_error: token.message || "Spotify is not connected.",
    });
  }

  try {
    const device = await getQueueTargetDevice(token.accessToken);
    await addSpotifyTrackToQueue(
      row.spotify_track_uri,
      token.accessToken,
      device.id ?? null,
    );

    await syncCurrentPlayback(true);

    return updateSuggestionStatus(suggestionId, {
      status: "queued" as GymMusicSuggestionStatus,
      queued_by: adminUserId,
      queued_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      queue_error: null,
    });
  } catch (error) {
    return updateSuggestionStatus(suggestionId, {
      status: "failed" as GymMusicSuggestionStatus,
      queue_error: sanitizeSpotifyError(error),
    });
  }
}

export async function rejectMusicSuggestion(
  suggestionId: string,
  adminUserId: string,
) {
  return updateSuggestionStatus(suggestionId, {
    status: "rejected" as GymMusicSuggestionStatus,
    rejected_by: adminUserId,
    rejected_at: new Date().toISOString(),
    queue_error: null,
  });
}

export async function getAdminMusicSuggestions() {
  const admin = createAdminClient();
  const { data: suggestions, error } = await admin
    .from("gym_music_suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (suggestions ?? []) as GymMusicSuggestion[];
  const userIds = Array.from(new Set(rows.map((row) => row.suggested_by)));
  const profiles = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const profile of (profileRows ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      profiles.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }

  return rows.map<SuggestionWithProfile>((row) => {
    const profile = profiles.get(row.suggested_by);
    return {
      ...row,
      suggested_by_name: profile?.full_name ?? null,
      suggested_by_email: profile?.email ?? null,
    };
  });
}
