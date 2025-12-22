import dns from 'dns/promises'
import crypto from 'crypto'
import tls from 'tls'
import { URL } from 'url'
import prisma from './prisma'

// --------------------
// 1️⃣ NETWORK ERROR CLASSIFICATION
// --------------------
function classifyError(error: any) {
  if (error.name === 'AbortError') return 'TIMEOUT'
  if (error.code === 'ENOTFOUND') return 'DNS_NOT_FOUND'
  if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED'
  if (error.code === 'ECONNRESET') return 'CONNECTION_RESET'
  if (error.code === 'ETIMEDOUT') return 'TIMEOUT'
  if (error.message?.includes('SSL')) return 'SSL_ERROR'
  return 'NETWORK_ERROR'
}

// --------------------
// 2️⃣ DNS CHECK
// --------------------
async function checkDNS(hostname: string) {
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
function getStatusType(status: number) {
  if (status >= 200 && status < 300) return 'UP'
  if (status >= 300 && status < 400) return 'REDIRECT'
  if (status >= 400 && status < 500) return 'CLIENT_ERROR'
  if (status >= 500) return 'DOWN'
  return 'UNKNOWN'
}

// --------------------
// 5️⃣ CONTENT HASH CHECK (LEVEL 2)
// --------------------
async function getContentHash(url: string) {
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
async function checkSSL(hostname: string) {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      resolve({ sslValid: socket.authorized, sslExpiry: cert.valid_to })
    })
    socket.on('error', () => resolve({ sslValid: false, sslExpiry: null }))
  })
}

// --------------------
// 7️⃣ ENDPOINT CHECK (HTTP + TIMEOUT)
// --------------------
async function checkEndpoint(url: string) {
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
      responseTime: `${responseTime}ms`,
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

// --------------------
// 8️⃣ FULL MONITORING PIPELINE
// --------------------
export async function getUrlsandRunScript() {
  const endPoints = await prisma.endPoint.findMany()

  for (const endpoint of endPoints) {
    const hostname = new URL(endpoint.url).hostname

    // DNS
    const dnsResult = await checkDNS(hostname)

    // SSL
    const sslResult: any = await checkSSL(hostname)

    // HTTP + Latency
    const httpResult = await checkEndpoint(endpoint.url)

    // Content hash
    const contentResult = await getContentHash(endpoint.url)

    console.log({
      url: endpoint.url,

      // HTTP + latency
      status: httpResult.status,
      statusCode: httpResult.statusCode ?? null,
      responseTime: httpResult.responseTime ?? null,
      reason: httpResult.reason ?? null,

      // DNS
      dnsStatus: dnsResult.dnsStatus,
      ip: dnsResult.ip,

      // SSL
      sslValid: sslResult.sslValid,
      sslExpiry: sslResult.sslExpiry,

      // Content hash
      contentHash: contentResult.hash,
      contentLength: contentResult.length,
    })
  }
}