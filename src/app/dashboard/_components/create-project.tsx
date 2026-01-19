'use client'
// import { api } from '@/trpc-server/react'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { projectSchema } from "@/types";
import { AllProjects } from "./all-projects";

const CreateProject = () => {
    const [createProject, setCreateProject] = useState(false)
    // const { mutateAsync: addURL, isPending, } = api.monitor.add.useMutation({
    //     onError: (error) => {
    //         console.error("API error:", error);
    //     }
    // })

    const form = useForm<z.infer<typeof projectSchema>>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: "",
            description: ""
        },
    });



    async function onSubmit(values: z.infer<typeof projectSchema>) {
        // console.log(values)
        // if (!values.emailAlert && !values.slackAlert) {
        //     toast.error("Please select at least one alert method");
        //     return;
        // }
        // if (values.emailAlert && !values.email) {
        //     toast.error("Please enter an email address");
        //     return;
        // }
        // if (values.slackAlert && !values.slackWebhook) {
        //     toast.error("Please enter a Slack webhook URL");
        //     return;
        // }

        // if (!values.url.startsWith("http://") && !values.url.startsWith("https://")) {
        //     values.url = "https://" + values.url
        // }


        // await addURL({
        //     ...values
        // })

        // toast.success("Monitor Created Successfully");
        // form.reset()

    }

    return (
        <>
            {
                createProject ? (
                    <>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <Card className="gap-0 py-5">
                                    <CardHeader>
                                        {/* <CardTitle>Project Detail</CardTitle> */}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Project Name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Description</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Project Description" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="flex gap-4 mt-6">
                                            <Button type="submit">
                                                Create Project
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </form>
                        </Form>
                    </>
                ) : <EmptyDemo />
            }


            <div className="mt-8">
                <AllProjects />
            </div>
            {/* <div className="mt-4">
                <AddUrlsForm />
            </div> */}
        </>
    )
}

export default CreateProject


import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { FolderX } from "lucide-react";
import { useState } from 'react';

function EmptyDemo() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FolderX />
                </EmptyMedia>
                <EmptyTitle>No Projects Yet</EmptyTitle>
                <EmptyDescription>
                    You haven&apos;t created any projects yet. Get started by creating
                    your first project.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <div className="flex gap-2">
                    <Button>Create Project</Button>
                    {/* <Button variant="outline">Import Project</Button> */}
                </div>
            </EmptyContent>
            {/* <Button
                variant="link"
                asChild
                className="text-muted-foreground"
                size="sm"
            >
                <a href="#">
                    Learn More <ArrowUpRightIcon />
                </a>
            </Button> */}
        </Empty>
    )
}
