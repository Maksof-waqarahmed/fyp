"use client"

import {
  Bot,
  Frame,
  LayoutDashboard,
  Settings2,
  SquareTerminal
} from "lucide-react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Logo } from "./logo"
import { NavMain } from "./nav-main"
// import { NavUser } from "./nav-user"
// import { useSession } from "@/lib/auth-client"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Monitoring",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Create Project",
          url: "/dashboard/monitoring/create-project",
          icon: Frame,
        },
        {
          title: "Logs",
          url: "/dashboard/monitoring/logs",
          icon: SquareTerminal,
        },
        {
          title: "URLS",
          url: "/dashboard/monitoring/allURLs",
          icon: Settings2,
        },
      ],
    },
    {
      title: "AI Assistant",
      url: "/dashboard/chatbot",
      icon: Bot,
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="bg-zinc-950">
        <div className=" h-full">
          <div className="absolute top-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <NavMain items={data.navMain} />
        </div>
      </SidebarContent>
      {/* <SidebarFooter> */}
      {/* {
          session &&
          <NavUser user={session?.user} />
        } */}
      {/* </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  )
}
