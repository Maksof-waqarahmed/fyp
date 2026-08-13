import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { RunCheckButton } from './run-check-button'
import { serverSession, ServerSession } from '@/lib/auth-sever';
import Image from 'next/image'

const Header = async () => {
    const session: ServerSession = await serverSession();
    const userName = session?.user.name || "Guest";
    const profile = session?.user.image;
    return (
        <div>
            <header className="sticky top-0 z-10 h-14 bg-background shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4 h-14">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-8"
                    />
                    <div className="flex items-end justify-end gap-6 w-full">
                        <div className="flex w-full justify-between items-center gap-3">
                            <div>
                                <h1 className="md:text-lg text-base font-semibold">Welcome back, <span className='text-primary font-bold'>{userName}</span></h1>
                                <p className="text-xs text-muted-foreground">Have a productive day</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <RunCheckButton />
                                <ThemeToggle />
                                <div className="h-10 w-10 rounded-full from-primary to-primary/80 flex items-center justify-center overflow-hidden border-2 border-primary">
                                    {profile && (
                                        <Image
                                            src={profile || ""}
                                            alt="profile"
                                            width={100}
                                            height={100}
                                            className="w-full h-full object-cover"
                                        />)}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
                <Separator />
            </header>
        </div>
    )
}

export default Header