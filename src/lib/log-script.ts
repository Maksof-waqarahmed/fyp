import crypto from 'crypto'
import dns from 'dns/promises'
import tls from 'tls'

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
export async function checkDNS(hostname: string) {
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
export function getStatusType(status: number) {
  if (status >= 200 && status < 300) return 'UP'
  if (status >= 300 && status < 400) return 'REDIRECT'
  if (status >= 400 && status < 500) return 'CLIENT_ERROR'
  if (status >= 500) return 'DOWN'
  return 'UNKNOWN'
}

// --------------------
// 5️⃣ CONTENT HASH CHECK (LEVEL 2)
// --------------------
export async function getContentHash(url: string) {
  try {
    const res = await fetch(url)
    const html = await res.text()
    const hash = crypto.createHash('sha256').update(html).digest('hex')
    return { hash, length: html.length }
  } catch {
    return { hash: null, length: 0 }
  }
}

// --------------------
// 6️⃣ SSL CHECK (LEVEL 3)
// --------------------

type SSLCheckResult = {
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
export async function checkEndpoint(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const start = Date.now()
    const res = await fetch(url, { signal: controller.signal })
    const responseTime = Date.now() - start

    return {
      url,
      statusCode: res.status,
      status: getStatusType(res.status),
      responseTime: responseTime,
    }
  } catch (error) {
    return {
      url,
      status: 'DOWN',
      reason: classifyError(error),
      responseTime: null,
    }
  } finally {
    clearTimeout(timeout)
  }
}