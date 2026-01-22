import { getUrlsandRunScript } from "@/lib/log-script"
import prisma from "@/lib/prisma"

async function test() {
    await prisma.project.create({
        data: {
            projectName: "Uptime 2",
            description: "Xyz",
            userId: 'aBrRp0ut5BNDXRonaHpdK4A4eyicYvjA',
        }
    })
}

// test()

const dummyURLS = [
    'https://www.google.com',
    'https://www.github.com',
    'https://httpstat.us/500',
    'https://httpstat.us/503',
    'https://httpstat.us/404',
    'https://thisurldoesnotexist12345.com',
    'https://httpstat.us/200?sleep=5000',
    'https://httpstat.us/200?sleep=10000',
    'https://httpstat.us/401',
    'https://httpstat.us/403',
    'https://httpstat.us/200',
    'https://httpstat.us/500',
    'https://httpstat.us/200?sleep=5000',
    'https://httpstat.us/404',
]
async function createUrls() {
    const now = new Date()
    try {
        const promises = dummyURLS.map((url, index) =>
            prisma.endpoint.create({
                data: {
                    name: `Test Endpoint ${index + 1}`,
                    url,
                    projectId: 'cmkm5s84r0000p8rd2j89p901',
                    checkInterval: 2,
                    userId: 'aBrRp0ut5BNDXRonaHpdK4A4eyicYvjA',
                    date: now,
                    time: now,
                    nextCheckAt: new Date(Date.now() + Number(2) * 60 * 1000)
                }
            })
        )

        await Promise.all(promises)
        console.log('✅ All dummy URLs created successfully')

    } catch (error) {
        console.error('❌ Error creating URLs:', error)
    }
}

// createUrls()

import cron from "node-cron";

console.log("Starting monitoring cron...");

cron.schedule("* * * * *", async () => {
    console.log("Running website checks...");
    await  getUrlsandRunScript();
});