import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const QR_TTL_SECONDS = 15;

type QrTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

function getSecret() {
  const secret = process.env.QR_TOKEN_SECRET;

  if (!secret) {
    throw new Error("Missing QR_TOKEN_SECRET env variable");
  }

  return secret;
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPart(part: string) {
  return createHmac("sha256", getSecret()).update(part).digest("base64url");
}

export function createQrToken(userId: string, ttlSeconds = QR_TTL_SECONDS) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: QrTokenPayload = {
    sub: userId,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    jti: randomUUID(),
  };

  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signaturePart = signPart(payloadPart);

  return {
    token: `${payloadPart}.${signaturePart}`,
    payload,
  };
}

export function verifyQrToken(token: string) {
  const [payloadPart, signaturePart] = token.split(".");

  if (!payloadPart || !signaturePart) {
    return { ok: false as const, reason: "invalid_format" };
  }

  const expectedSignature = signPart(payloadPart);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signaturePart);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false as const, reason: "invalid_signature" };
  }

  let parsed: QrTokenPayload;

  try {
    parsed = JSON.parse(fromBase64Url(payloadPart)) as QrTokenPayload;
  } catch {
    return { ok: false as const, reason: "invalid_payload" };
  }

  if (
    typeof parsed.sub !== "string" ||
    typeof parsed.iat !== "number" ||
    typeof parsed.exp !== "number" ||
    typeof parsed.jti !== "string"
  ) {
    return { ok: false as const, reason: "invalid_payload" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSeconds) {
    return { ok: false as const, reason: "expired" };
  }

  return {
    ok: true as const,
    payload: parsed,
  };
}
