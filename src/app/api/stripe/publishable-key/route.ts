import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ENV_FILE_CANDIDATES = [
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
];

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const singleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");
  const doubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');

  if ((singleQuoted || doubleQuoted) && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function parseEnvVariable(raw: string, name: string) {
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const withoutExport = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;

    const eqIndex = withoutExport.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = withoutExport.slice(0, eqIndex).trim();
    if (key !== name) {
      continue;
    }

    const valuePart = withoutExport.slice(eqIndex + 1);
    return normalizeEnvValue(valuePart);
  }

  return "";
}

async function getPublishableKey() {
  const runtimeValue = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  if (runtimeValue.startsWith("pk_")) {
    return { key: runtimeValue, debug: { source: "runtime" } };
  }

  const debugLookups: { file: string; found: boolean }[] = [];

  for (const envFile of ENV_FILE_CANDIDATES) {
    try {
      const envPath = join(process.cwd(), envFile);
      const raw = await readFile(envPath, "utf8");
      const key = parseEnvVariable(raw, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      debugLookups.push({ file: envFile, found: Boolean(key) });

      if (key.startsWith("pk_")) {
        return { key, debug: { source: envFile, lookups: debugLookups } };
      }
    } catch {
      debugLookups.push({ file: envFile, found: false });
    }
  }

  return {
    key: "",
    debug: {
      source: "none",
      lookups: debugLookups,
      cwd: process.cwd(),
      runtimePresent: Boolean(runtimeValue),
      runtimePreview: runtimeValue.slice(0, 24),
    },
  };
}

export async function GET() {
  const { key: publishableKey, debug } = await getPublishableKey();

  if (!publishableKey) {
    return NextResponse.json(
      {
        error: "missing_publishable_key",
        details: process.env.NODE_ENV === "development" ? debug : undefined,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { publishableKey },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
