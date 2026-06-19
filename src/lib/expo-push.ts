import { createAdminClient } from "@/lib/supabase/admin";

type PushTokenRow = {
  token: string;
};

type ExpoPushData = Record<string, string | number | boolean | null>;

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: ExpoPushData;
  channelId?: string;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
};

export type PushSendResult = {
  tokenCount: number;
  acceptedCount: number;
  invalidTokenCount: number;
  errors: string[];
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength - 1).trimEnd();
  const lastSpaceIndex = shortened.lastIndexOf(" ");
  const preview =
    lastSpaceIndex > Math.floor(maxLength * 0.6)
      ? shortened.slice(0, lastSpaceIndex)
      : shortened;

  return `${preview}...`;
}

function getExpoTokens(rows: PushTokenRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.token)
        .filter((token) => token.startsWith("ExponentPushToken[")),
    ),
  );
}

async function getPushTokens(userId?: string) {
  const admin = createAdminClient();
  let query = admin.from("push_tokens").select("token");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load push tokens: ${error.message}`);
  }

  return getExpoTokens((data ?? []) as PushTokenRow[]);
}

async function removeInvalidTokens(tokens: string[]) {
  if (tokens.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("push_tokens").delete().in("token", tokens);

  if (error) {
    console.error("Failed to remove invalid Expo push tokens", error.message);
  }
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<PushSendResult> {
  if (messages.length === 0) {
    return { tokenCount: 0, acceptedCount: 0, invalidTokenCount: 0, errors: [] };
  }

  const chunkResults = await Promise.all(
    chunk(messages, 100).map(async (messagesChunk) => {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagesChunk),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`Expo push send failed: ${JSON.stringify(payload)}`);
      }

      const tickets = Array.isArray(payload?.data) ? (payload.data as ExpoPushTicket[]) : [];
      const invalidTokens: string[] = [];
      const errors: string[] = [];
      let acceptedCount = 0;

      tickets.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          acceptedCount += 1;
          return;
        }

        if (ticket.status === "error") {
          const token = messagesChunk[index]?.to;
          const message = ticket.message ?? "Unknown Expo push ticket error";
          errors.push(message);

          if (ticket.details?.error === "DeviceNotRegistered" && token) {
            invalidTokens.push(token);
          }
        }
      });

      return { acceptedCount, invalidTokens, errors };
    }),
  );

  const invalidTokens = Array.from(new Set(chunkResults.flatMap((result) => result.invalidTokens)));
  await removeInvalidTokens(invalidTokens);

  return {
    tokenCount: messages.length,
    acceptedCount: chunkResults.reduce((total, result) => total + result.acceptedCount, 0),
    invalidTokenCount: invalidTokens.length,
    errors: chunkResults.flatMap((result) => result.errors),
  };
}

export async function sendGymNewsPushNotification(news: {
  id?: string | null;
  title: string;
  contentHtml: string;
}) {
  const tokens = await getPushTokens();
  const title = news.title.trim() || "Novy oznam";
  const body =
    truncateText(stripHtml(news.contentHtml), 140) ||
    "Pozri si najnovsie aktuality z gymu.";

  const result = await sendExpoPushMessages(
    tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: {
        url: "/news",
        newsId: news.id ?? "",
      },
      channelId: "gym-news",
    })),
  );

  result.errors.forEach((error) => console.error("Expo push ticket error", error));
  return result;
}

export async function sendBookingReminderPushNotification(input: {
  userId: string;
  bookingId: string;
  title: string;
  body: string;
}) {
  const tokens = await getPushTokens(input.userId);

  return sendExpoPushMessages(
    tokens.map((token) => ({
      to: token,
      sound: "default",
      title: input.title,
      body: input.body,
      data: {
        url: "/book",
        bookingId: input.bookingId,
        notificationType: "booking_reminder",
      },
      channelId: "booking-reminders",
    })),
  );
}
