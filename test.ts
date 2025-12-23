// async function test() {
//     await prisma.project.create({
//         data: {
//             projectName: "Uptime",
//             userId: 'D6ZrVHhUI6tTWOxuS93uj4JEQ8CwRw7l',
//         }
//     })
// }

// const dummyURLS = [
//     'https://www.google.com',
//     'https://www.github.com',
//     'https://httpstat.us/500',
//     'https://httpstat.us/503',
//     'https://httpstat.us/404',
//     'https://thisurldoesnotexist12345.com',
//     'https://httpstat.us/200?sleep=5000',
//     'https://httpstat.us/200?sleep=10000',
//     'https://httpstat.us/401',
//     'https://httpstat.us/403',
//     'https://httpstat.us/200',
//     'https://httpstat.us/500',
//     'https://httpstat.us/200?sleep=5000',
//     'https://httpstat.us/404',
// ]
// async function createUrls() {
//     try {
//         const promises = dummyURLS.map((url, index) =>
//             prisma.endPoint.create({
//                 data: {
//                     name: `Test Endpoint ${index + 1}`,
//                     url,
//                     projectId: 'cmja14vqr0000vkrdkf5xsihw',
//                     checkInterval: 1,
//                     userId: 'D6ZrVHhUI6tTWOxuS93uj4JEQ8CwRw7l',
//                 }
//             })
//         )

//         await Promise.all(promises)
//         console.log('✅ All dummy URLs created successfully')

//     } catch (error) {
//         console.error('❌ Error creating URLs:', error)
//     }
// }

// createUrls()

