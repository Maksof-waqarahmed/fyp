import { Mail } from 'lucide-react'
import Image from 'next/image'
import Cards from './cards'
import RecentActivity from './recent-activity'
import { ServerSession, serverSession } from '@/lib/auth-sever'

const Main = async () => {
    const session: ServerSession = await serverSession();
    const userName = session?.user.name || "Guest";
    const profile = session?.user.image;
    const userEmail = session?.user.email;
    return (
        <main className="px-6 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-6 mb-6">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full from-primary via-primary/80 to-primary/60 flex items-center justify-center overflow-hidden border-2 border-primary">
                            <Image src={profile || ''} alt='profile'
                                width={100}
                                height={100}
                                className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold tracking-tight">{userName}</h2>
                        <p className="text-muted-foreground mt-1">Premium Member</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {userEmail}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Cards />
            <RecentActivity />
        </main>
    )
}

export default Main