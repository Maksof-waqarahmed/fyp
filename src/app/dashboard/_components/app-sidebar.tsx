'use client'

import {
  Frame,
  LayoutDashboard,
  Settings,
  Settings2,
  SquareTerminal,
  ArrowDownNarrowWide,
  FileChartLine
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
import { NavUser } from "./nav-user"
import { useSession } from "@/lib/auth-client"


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
          title: "All Projects",
          url: "/dashboard/monitoring/allProjects",
          icon: Settings2,
        },
        {
          title: "All Endpoints",
          url: "/dashboard/monitoring/allEndPoints",
          icon: Settings2,
        }
      ],
    },
    {
      title: "Incidents",
      url: "/dashboard/incidents",
      icon: ArrowDownNarrowWide,
    },
    {
      title: "Status Pages",
      url: "/dashboard/status-pages",
      icon: FileChartLine,
    },
    {
      title: "User Settings",
      url: "/dashboard/user-setting",
      icon: Settings,
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const session = useSession()
  const currentUser = session?.data?.user

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <div className=" h-full">
          <div className="absolute top-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <NavMain items={data.navMain} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        {
          session &&
          <NavUser user={currentUser} />
        }
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
