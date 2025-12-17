'use client'
// import { api } from '@/trpc-server/react'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form"
import { toast } from 'sonner'
import { z } from "zod"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { monitorSchema } from "@/types"

const AddUrlsForm = () => {
    // const { mutateAsync: addURL, isPending, } = api.monitor.add.useMutation({
    //     onError: (error) => {
    //         console.error("API error:", error);
    //     }
    // })

    const form = useForm<z.infer<typeof monitorSchema>>({
        resolver: zodResolver(monitorSchema),
        defaultValues: {
            name: "",
            url: "",
            checkInterval: "5",
            timeout: "30",
            emailAlert: true,
            email: "",
            slackAlert: false,
            slackWebhook: "",
        },
    });



    async function onSubmit(values: z.infer<typeof monitorSchema>) {
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Monitor Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Website Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL to Monitor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="checkInterval"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Check Interval</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select interval" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1">Every 1 minute</SelectItem>
                                                <SelectItem value="5">Every 5 minutes</SelectItem>
                                                <SelectItem value="10">Every 10 minutes</SelectItem>
                                                <SelectItem value="30">Every 30 minutes</SelectItem>
                                                <SelectItem value="60">Every 1 hour</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="timeout"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Timeout (seconds)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="5" max="300" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="emailAlert"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                        <div>
                                            <FormLabel>Email Alerts</FormLabel>
                                            <p className="text-sm text-muted-foreground">Receive email notifications when status changes</p>
                                            <FormMessage />
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {
                                form.watch("emailAlert") && (
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem className='w-96'>
                                                <FormControl>
                                                    <Input type="email" {...field} placeholder="example@gmail.com" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )
                            }

                            <FormField
                                control={form.control}
                                name="slackAlert"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                        <div>
                                            <FormLabel>Slack Alerts</FormLabel>
                                            <p className="text-sm text-muted-foreground">Send notifications to your Slack channel</p>
                                            <FormMessage />
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            {
                                form.watch("slackAlert") && (
                                    <FormField
                                        control={form.control}
                                        name="slackWebhook"
                                        render={({ field }) => (
                                            <FormItem className='w-96'>
                                                <FormControl>
                                                    <Input {...field} placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )
                            }

                        </div>

                        <div className="flex gap-4 mt-6">
                            {/* <Button type="submit" disabled={isPending}>
                                {isPending ? "Creating Monitor..." : "Create Monitor"}
                            </Button> */}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    )
}

export default AddUrlsForm
