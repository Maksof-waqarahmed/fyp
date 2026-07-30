import crypto from 'crypto'
import dns from 'dns/promises'
import tls from 'tls'
import { HTTPStatus } from '../../prisma/generated/prisma/enums';

// --------------------
// 1️⃣ NETWORK ERROR CLASSIFICATION
// --------------------

type NetworkErrorType =
  | "TIMEOUT"
  | "DNS_NOT_FOUND"
  | "CONNECTION_REFUSED"
  | "CONNECTION_RESET"
  | "SSL_ERROR"
  | "NETWORK_ERROR";

export function classifyError(error: unknown): NetworkErrorType {
  if (error instanceof Error) {
    const err = error as Error & { code?: string };

    if (err.name === "AbortError") return "TIMEOUT";
    if (err.code === "ENOTFOUND") return "DNS_NOT_FOUND";
    if (err.code === "ECONNREFUSED") return "CONNECTION_REFUSED";
    if (err.code === "ECONNRESET") return "CONNECTION_RESET";
    if (err.code === "ETIMEDOUT") return "TIMEOUT";
    if (err.message.toLowerCase().includes("ssl")) return "SSL_ERROR";
  }

  return "NETWORK_ERROR";
}

// --------------------
// 2️⃣ DNS CHECK
// --------------------

export type DNSResult = { dnsStatus: "RESOLVED"; ip: string } | { dnsStatus: "FAILED"; ip: null };

export async function checkDNS(hostname: string): Promise<DNSResult> {
  try {
    const result = await dns.lookup(hostname)
    return { dnsStatus: 'RESOLVED', ip: result.address }
  } catch {
    return { dnsStatus: 'FAILED', ip: null }
  }
}

// --------------------
// 3️⃣ HTTP STATUS CLASSIFICATION
// --------------------

type Status = 'UP' | 'REDIRECT' | 'CLIENT_ERROR' | 'DOWN' | 'UNKNOWN';

export function getStatusType(status: number): Status {
  if (status >= 200 && status < 300) return 'UP'
  if (status >= 300 && status < 400) return 'REDIRECT'
  if (status >= 400 && status < 500) return 'CLIENT_ERROR'
  if (status >= 500) return 'DOWN'
  return 'UNKNOWN'
}

// --------------------
// 5️⃣ CONTENT HASH CHECK (LEVEL 2)
// --------------------

export type ContentResult = { hash: string; length: number } | { hash: null; length: 0 };

export async function getContentHash(url: string): Promise<ContentResult> {
  try {
    const res = await fetch(url)
    const html = await res.text()
    const hash = crypto.createHash('sha256').update(html).digest('hex')
    return { hash, length: html.length }
  } catch {
    return { hash: null, length: 0 }
  }
}

// Content-change / defacement signal. Returns true only when we have a real
// prior hash to compare against and it differs from the current one. The very
// first observation (no previous hash) returns false so we never alert on an
// endpoint's first-ever check. Missing current hash (unreachable) → false.
export function hasContentChanged(
  previousHash: string | null,
  currentHash: string | null
): boolean {
  if (!previousHash || !currentHash) return false
  return previousHash !== currentHash
}

// --------------------
// 6️⃣ SSL CHECK (LEVEL 3)
// --------------------

export type SSLCheckResult = {
  sslValid: boolean;
  sslExpiry: string | null;
};

export async function checkSSL(hostname: string): Promise<SSLCheckResult> {
  return new Promise<SSLCheckResult>((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      resolve({ sslValid: socket.authorized, sslExpiry: cert.valid_to ?? null })
    })
    socket.on('error', () => resolve({ sslValid: false, sslExpiry: null }))
  })
}

// --------------------
// 7️⃣ ENDPOINT CHECK (HTTP + TIMEOUT)
// --------------------

export type EndpointUp = {
  url: string;
  status: HTTPStatus;
  statusCode: number;
  responseTime: number;
};

export type EndpointDown = {
  url: string;
  status: HTTPStatus;
  responseTime: null;
  reason: NetworkErrorType;
};

export type EndPointType = EndpointUp | EndpointDown;

export async function checkEndpoint(url: string): Promise<EndPointType> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const start = Date.now();
    const res = await fetch(url, { signal: controller.signal });
    const responseTime = Date.now() - start;

    return {
      url,
      status: getStatusType(res.status),
      statusCode: res.status,
      responseTime,
    };
  } catch (error) {
    return {
      url,
      status: "DOWN",
      responseTime: null,
      reason: classifyError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
