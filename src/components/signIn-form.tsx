"use client"

import { Button } from "@/components/ui/button"
import type React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Github, Loader2, Chrome, Shield } from "lucide-react"
import { useCallback, useState } from "react"
import { signIn } from "@/lib/auth/auth-client"

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<"google" | "github" | null>(null)

  const _signIn = useCallback(async (selectedProvider: "google" | "github") => {
    try {
      setLoading(true)
      setProvider(selectedProvider)
      await signIn.social({
        provider: selectedProvider,
        callbackURL: '/',
      });
      console.log(`[v0] Signing in with ${selectedProvider}`)
    } catch (error) {
      console.error("Sign-in error:", error)
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }, [])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 shadow-lg bg-white dark:bg-zinc-900">
        <CardHeader className="text-center pb-4">
          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground text-sm mt-1">Choose your preferred sign-in method</p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium border-2 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-200 group bg-transparent"
              onClick={() => _signIn("google")}
              disabled={loading}
            >
              {loading && provider === "google" ? (
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Chrome className="h-5 w-5 mr-3 text-blue-500 group-hover:scale-110 transition-transform duration-200" />
              )}
              {loading && provider === "google" ? "Connecting..." : "Continue with Google"}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium border-2 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-200 group bg-transparent"
              onClick={() => _signIn("github")}
              disabled={loading}
            >
              {loading && provider === "github" ? (
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Github className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
              )}
              {loading && provider === "github" ? "Connecting..." : "Continue with GitHub"}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-3 text-muted-foreground font-medium tracking-wider">
                Secure Authentication
              </span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-green-500" />
              <span>Protected by enterprise-grade security</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              By continuing, you agree to our{" "}
              <a href="#" className="text-foreground hover:underline underline-offset-4 transition-colors font-medium">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-foreground hover:underline underline-offset-4 transition-colors font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
