import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CircleChevronRight, SquarePen, Trash2 } from "lucide-react"

const projects = [
    {
        title: "E-Commerce Platform",
        description: "Full-stack e-commerce app with authentication and payments.",
        tech: ["Next.js", "TypeScript", "PostgreSQL", "Stripe"],
        github: "#",
        live: "#",
    },
    {
        title: "AI Chat Application",
        description: "AI-powered chat app using OpenAI and LangChain.",
        tech: ["React", "Node.js", "LangChain", "OpenAI"],
        github: "#",
        live: "#",
    },
    {
        title: "Task Management System",
        description: "Task manager with role-based access and real-time updates.",
        tech: ["Next.js", "Prisma", "MongoDB"],
        github: "#",
        live: "#",
    },
]

export function AllProjects() {
    return (
        <>
            <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>

            <Card className="mt-4">
                <CardTitle>Filter</CardTitle>
                

            </Card>

            <div className="mt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.map((project, index) => (
                            <TableRow key={index}>
                                <TableCell>{project.title}</TableCell>
                                <TableCell>{project.description}</TableCell>
                                <TableCell>
                                    {project.tech.map((tech, i) => (
                                        <span key={i}>{tech}</span>
                                    ))}
                                </TableCell>
                                <TableCell className="space-x-3">
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={project.github} target="_blank" rel="noopener noreferrer">
                                            <Trash2 />
                                        </a>
                                    </Button>
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={project.live} target="_blank" rel="noopener noreferrer">
                                            <SquarePen />
                                        </a>
                                    </Button>
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={project.live} target="_blank" rel="noopener noreferrer">
                                            <CircleChevronRight />
                                        </a>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
