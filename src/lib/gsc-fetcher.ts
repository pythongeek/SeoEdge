/**
 * Google Search Console API Client
 * OAuth + Service Account support with encrypted token storage
 */

import { google } from "googleapis";
import { decrypt, encrypt } from "./crypto-utils";

// ─── Types ────────────────────────────────────────────────────────────

export interface GscCredentials {
  type: "oauth" | "service_account";
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  serviceAccountEmail?: string;
  serviceAccountKey?: string;
}

export interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  device?: string;
  country?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────

export async function getGscClient(credentials: GscCredentials) {
  if (credentials.type === "oauth" && credentials.refreshToken) {
    const auth = new google.auth.OAuth2(
      process.env.GSC_CLIENT_ID,
      process.env.GSC_CLIENT_SECRET,
      process.env.GSC_REDIRECT_URI
    );

    // Decrypt refresh token if encrypted
    let refreshToken = credentials.refreshToken;
    try {
      refreshToken = decrypt(refreshToken);
    } catch {
      // Not encrypted, use as-is
    }

    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: refreshToken,
      expiry_date: credentials.expiryDate,
    });

    // Auto-refresh
    auth.on("tokens", (tokens) => {
      console.log("[GSC] Token refreshed");
    });

    return google.searchconsole({ version: "v1", auth });
  }

  if (credentials.type === "service_account") {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.serviceAccountEmail,
        private_key: credentials.serviceAccountKey?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    return google.searchconsole({ version: "v1", auth });
  }

  throw new Error("Invalid GSC credentials");
}

// ─── Site List ────────────────────────────────────────────────────────

export async function listSites(credentials: GscCredentials): Promise<
  Array<{ siteUrl: string; permissionLevel: string }>
> {
  const client = await getGscClient(credentials);
  const res = await client.sites.list();
  return (
    res.data.siteEntry?.map((s) => ({
      siteUrl: s.siteUrl || "",
      permissionLevel: s.permissionLevel || "",
    })) || []
  );
}

// ─── Search Analytics ─────────────────────────────────────────────────

export async function fetchSearchAnalytics(
  credentials: GscCredentials,
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimensions?: ("query" | "page" | "country" | "device")[];
    rowLimit?: number;
    dimensionFilterGroups?: any[];
  }
): Promise<GscRow[]> {
  const client = await getGscClient(credentials);

  const requestBody = {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions: options.dimensions || ["query", "page"],
    rowLimit: Math.min(options.rowLimit || 25000, 25000),
    dimensionFilterGroups: options.dimensionFilterGroups,
  };

  const res = await client.searchanalytics.query({ siteUrl, requestBody });

  return (
    res.data.rows?.map((row) => {
      const keys = row.keys || [];
      const dims = options.dimensions || ["query", "page"];

      return {
        query: dims.includes("query") ? keys[dims.indexOf("query")] || "" : "",
        page: dims.includes("page") ? keys[dims.indexOf("page")] || "" : "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        device: dims.includes("device") ? keys[dims.indexOf("device")] : undefined,
        country: dims.includes("country") ? keys[dims.indexOf("country")] : undefined,
      } as GscRow;
    }) || []
  );
}

// ─── Date Utils ───────────────────────────────────────────────────────

export function getDateRange(period: string): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC data has 3-day delay
  const endDate = end.toISOString().split("T")[0];

  const start = new Date(end);
  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "28d":
      start.setDate(start.getDate() - 28);
      break;
    case "3m":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6m":
      start.setMonth(start.getMonth() - 6);
      break;
    case "12m":
      start.setMonth(start.getMonth() - 12);
      break;
    default:
      start.setDate(start.getDate() - 28);
  }

  return { startDate: start.toISOString().split("T")[0], endDate };
}

// ─── Token Encryption for Storage ─────────────────────────────────────

export function encryptTokenForStorage(token: string): string {
  try {
    return encrypt(token);
  } catch (e) {
    console.warn("[GSC] Token encryption failed, storing plain:", e);
    return token;
  }
}

export function decryptTokenForUse(encryptedToken: string): string {
  try {
    return decrypt(encryptedToken);
  } catch {
    // Not encrypted or decryption failed, return as-is
    return encryptedToken;
  }
}
