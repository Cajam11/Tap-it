import { createAdminClient } from "@/lib/supabase/admin";

type PushTokenRow = {
  token: string;
};

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: {
    url: string;
    newsId: string;
  };
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

export async function sendGymNewsPushNotification(news: {
  id?: string | null;
  title: string;
  contentHtml: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("push_tokens").select("token");

  if (error) {
    console.error("Failed to load push tokens", error.message);
    return;
  }

  const tokens = Array.from(
    new Set(
      ((data ?? []) as PushTokenRow[])
        .map((row) => row.token)
        .filter((token) => token.startsWith("ExponentPushToken[")),
    ),
  );

  if (tokens.length === 0) return;

  const title = news.title.trim() || "Novy oznam";
  const body =
    truncateText(stripHtml(news.contentHtml), 140) ||
    "Pozri si najnovsie aktuality z gymu.";

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: {
      url: "/news",
      newsId: news.id ?? "",
    },
  }));

  await Promise.all(
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
        console.error("Expo push send failed", payload);
        return;
      }

      const tickets = Array.isArray(payload?.data) ? payload.data : [];
      tickets.forEach((ticket: { status?: string; message?: string }) => {
        if (ticket.status === "error") {
          console.error("Expo push ticket error", ticket.message);
        }
      });
    }),
  );
}
