"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Mail, MessageSquare, Save, TestTube2, Loader2, Check, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { api } from "@/trpc/trpc-server/react"

type UserProps = {
    data: {
        email: string;
        slackWebhook: string;
        whatsappNumber: string;
        isActive: boolean;
    }
}

const UserSetting = ({ data }: UserProps) => {
    const router = useRouter()
    const [email, setEmail] = useState(data.email)
    const [slackWebhook, setSlackWebhook] = useState(data.slackWebhook)
    // const [whatsappNumber, setWhatsappNumber] = useState(data.whatsappNumber)
    const [isActive, setIsActive] = useState(data.isActive)
    const [testingChannel, setTestingChannel] = useState<string | null>(null)

    // Update alert settings mutation
    const updateSettingsMutation = api.userSetting.alertSetting.useMutation({
        onSuccess: () => {
            toast.success("Settings saved successfully!")
            router.refresh()
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save settings")
        }
    })

    // Toggle notifications mutation
    const toggleNotificationsMutation = api.userSetting.toggleNotifications.useMutation({
        onSuccess: (result) => {
            toast.success(result.message)
            setIsActive(result.data.isActive)
        },
        onError: (error) => {
            toast.error(error.message || "Failed to toggle notifications")
        }
    })

    // Test notification mutation
    const testNotificationMutation = api.userSetting.testNotification.useMutation({
        onSuccess: (result) => {
            toast.success(result.message)
            setTestingChannel(null)
        },
        onError: (error) => {
            toast.error(error.message)
            setTestingChannel(null)
        }
    })

    const handleSaveSettings = () => {
        const payload: any = {}

        if (email && email !== data.email) {
            payload.email = email
        }
        if (slackWebhook && slackWebhook !== data.slackWebhook) {
            payload.slackWebhook = slackWebhook
        }
        // if (whatsappNumber && whatsappNumber !== data.whatsappNumber) {
        //     payload.whatsappNumber = whatsappNumber
        // }

        if (Object.keys(payload).length === 0) {
            toast.info("No changes to save")
            return
        }

        updateSettingsMutation.mutate(payload)
    }

    const handleToggleNotifications = (checked: boolean) => {
        toggleNotificationsMutation.mutate({ isActive: checked })
    }

    const handleTestNotification = (channel: "email" | "slack" | "whatsapp") => {
        setTestingChannel(channel)
        testNotificationMutation.mutate({ channel })
    }
    return (
        <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your notification preferences and alert channels
                </p>
            </div>

            <Separator />

            {/* Notification Toggle */}
            <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bell className="h-5 w-5" />
                                Notifications
                            </CardTitle>
                            <CardDescription>
                                Enable or disable all notification alerts
                            </CardDescription>
                        </div>
                        <Switch
                            checked={isActive}
                            onCheckedChange={handleToggleNotifications}
                            disabled={toggleNotificationsMutation.isPending}
                        />
                    </div>
                </CardHeader>
            </Card>

            {/* Alert Channels */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">

                {/* Email Settings */}
                <Card className={`border-none shadow-sm rounded-2xl transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                            Email Notifications
                        </CardTitle>
                        <CardDescription>
                            Receive alerts via email when endpoints go down
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={!isActive}
                                className="rounded-xl"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestNotification("email")}
                            disabled={!email || !isActive || testingChannel === "email"}
                            className="rounded-xl"
                        >
                            {testingChannel === "email" ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <TestTube2 className="h-4 w-4 mr-2" />
                                    Test Email
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Slack Settings */}
                <Card className={`border-none shadow-sm rounded-2xl transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-purple-600" />
                            </div>
                            Slack Notifications
                        </CardTitle>
                        <CardDescription>
                            Get instant alerts in your Slack workspace
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="slack">Slack Webhook URL</Label>
                            <Input
                                id="slack"
                                type="url"
                                placeholder="https://hooks.slack.com/services/..."
                                value={slackWebhook}
                                onChange={(e) => setSlackWebhook(e.target.value)}
                                disabled={!isActive}
                                className="rounded-xl font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                <a
                                    href="https://api.slack.com/messaging/webhooks"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-foreground"
                                >
                                    Learn how to create a Slack webhook
                                </a>
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestNotification("slack")}
                            disabled={!slackWebhook || !isActive || testingChannel === "slack"}
                            className="rounded-xl"
                        >
                            {testingChannel === "slack" ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <TestTube2 className="h-4 w-4 mr-2" />
                                    Test Slack
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* WhatsApp Settings */}
                {/* <Card className={`border-none shadow-sm rounded-2xl transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                            </div>
                            WhatsApp Notifications
                        </CardTitle>
                        <CardDescription>
                            Receive alerts directly on WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp Number</Label>
                            <Input
                                id="whatsapp"
                                type="tel"
                                placeholder="+1234567890"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                disabled={!isActive}
                                className="rounded-xl"
                            />
                            <p className="text-xs text-muted-foreground">
                                Include country code (e.g., +1 for USA, +92 for Pakistan)
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestNotification("whatsapp")}
                            disabled={!whatsappNumber || !isActive || testingChannel === "whatsapp"}
                            className="rounded-xl"
                        >
                            {testingChannel === "whatsapp" ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <TestTube2 className="h-4 w-4 mr-2" />
                                    Test WhatsApp
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card> */}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 sticky bottom-6 pt-4">
                <Button
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending || !isActive}
                    size="lg"
                    className="rounded-xl shadow-lg"
                >
                    {updateSettingsMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>

            {/* Status Indicators */}
            <Card className="border-none shadow-sm rounded-2xl bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Configured Channels</CardTitle>
                    <CardDescription>
                        Overview of your notification channels
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-background">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Email</span>
                            </div>
                            {email ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <span className="text-muted-foreground">{email}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs">
                                    <X className="h-4 w-4 text-red-500" />
                                    <span className="text-muted-foreground">Not configured</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-background">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Slack</span>
                            </div>
                            {slackWebhook ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <span className="text-muted-foreground">Configured</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs">
                                    <X className="h-4 w-4 text-red-500" />
                                    <span className="text-muted-foreground">Not configured</span>
                                </div>
                            )}
                        </div>

                        {/* <div className="flex items-center justify-between p-3 rounded-xl bg-background">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">WhatsApp</span>
                            </div>
                            {whatsappNumber ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <span className="text-muted-foreground">{whatsappNumber}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs">
                                    <X className="h-4 w-4 text-red-500" />
                                    <span className="text-muted-foreground">Not configured</span>
                                </div>
                            )}
                        </div> */}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default UserSetting