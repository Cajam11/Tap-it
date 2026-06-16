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

export async function sendGymNewsPushNotification(news: {
  id: string;
  title: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("push_tokens").select("token");

  if (error) {
    console.error("Failed to load push tokens", error);
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

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: "Novy oznam",
    body: news.title,
    data: {
      url: "/news",
      newsId: news.id,
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

      if (!response.ok) {
        console.error("Expo push send failed", await response.text());
      }
    }),
  );
}