import { cookies } from "next/headers";
import { FLASH_COOKIE_NAME, createFlashCookieValue, type FlashMessage } from "@/lib/flash";

export async function setFlashMessage(message: FlashMessage) {
  const cookieStore = await cookies();

  cookieStore.set(FLASH_COOKIE_NAME, createFlashCookieValue(message), {
    path: "/",
    sameSite: "lax",
    maxAge: 60,
  });
}
