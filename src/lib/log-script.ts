import dns from 'dns/promises'
import crypto from 'crypto'
import tls from 'tls'
import { URL } from 'url'
import prisma from './prisma'
import { DNSStatus, HTTPStatus } from '../../prisma/generated/prisma/enums'

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
      resolve({ sslValid: socket.authorized, sslExpiry: cert.valid_to } as { sslValid: boolean, sslExpiry: string })
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

export async function getUrlsandRunScript() {
  try {
    const endPoints = await prisma.endpoint.findMany({
      where: {
        isDeleted: false,
        nextCheckAt: { lte: new Date() },
      },
      select: {
        id: true,
        name: true,
        checkInterval: true,
        url: true,
      },
    })

    for (const endpoint of endPoints) {
      const now = new Date()
      const hostname = new URL(endpoint.url).hostname

      const [
        dnsResult,
        sslResult,
        httpResult,
        contentResult,
      ] = await Promise.all([
        checkDNS(hostname),
        checkSSL(hostname),
        checkEndpoint(endpoint.url),
        getContentHash(endpoint.url),
      ])

      const sslExpiry =
        sslResult?.sslExpiry && !isNaN(new Date(sslResult.sslExpiry).getTime())
          ? new Date(sslResult.sslExpiry)
          : null

      const logData = {
        status: httpResult.status as HTTPStatus,
        httpCode: httpResult.statusCode ?? null,
        responseTime: httpResult.responseTime ? Number(httpResult.responseTime) : null,
        errorMessage: httpResult.reason ?? null,
        dnsStatus: dnsResult.dnsStatus as DNSStatus,
        ip: dnsResult.ip ?? null,
        sslValid: Boolean(sslResult.sslValid),
        sslExpiry,
        checkedAt: now,
        date: now,
        time: now,
        endPointId: endpoint.id,
        contentHash: contentResult.hash ?? null,
        contentLength: contentResult.length ?? null,
      }

      await prisma.log.create({ data: logData })

      await prisma.endpoint.update({
        where: { id: endpoint.id },
        data: {
          nextCheckAt: new Date(
            now.getTime() + Number(endpoint.checkInterval) * 60 * 1000
          ),
        },
      })

    }
  } catch (error) {
    console.error("❌ Error checking website:", error)
  }
}