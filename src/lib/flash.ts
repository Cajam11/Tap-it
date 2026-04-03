export type FlashKind = "success" | "error";

export type FlashMessage = {
  kind: FlashKind;
  text: string;
};

export const FLASH_COOKIE_NAME = "tapit_flash";

export function createFlashCookieValue(message: FlashMessage) {
  return encodeURIComponent(JSON.stringify(message));
}

export function parseFlashCookieValue(value: string | undefined | null): FlashMessage | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as FlashMessage;
    if (parsed && (parsed.kind === "success" || parsed.kind === "error") && typeof parsed.text === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}
