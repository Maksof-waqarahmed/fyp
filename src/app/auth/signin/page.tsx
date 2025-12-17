import { LoginForm } from "@/components/login-form"
import { BarChart3, Shield, Sparkles, Zap, TrendingUp, Users } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Hero section with visual */}
      <div className="relative hidden lg:flex flex-col justify-between bg-zinc-950 text-white p-12 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"></div>
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white p-2.5 rounded-xl">
              <Sparkles className="h-6 w-6 text-zinc-950" />
            </div>
            <span className="text-xl font-bold">DeployMonitor</span>
          </div>

          {/* Main content */}
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold leading-tight mb-6 text-balance">
              Monitor your deployments in real-time
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed mb-12">
              AI-powered insights and instant alerts to keep your applications running smoothly. Join thousands of
              developers who trust us with their infrastructure.
            </p>

            {/* Feature list */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="bg-zinc-900 p-3 rounded-xl group-hover:bg-zinc-800 transition-colors">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Real-time Analytics</h3>
                  <p className="text-sm text-zinc-400">
                    Track performance metrics and get actionable insights instantly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-zinc-900 p-3 rounded-xl group-hover:bg-zinc-800 transition-colors">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">99.9% Uptime Guarantee</h3>
                  <p className="text-sm text-zinc-400">Enterprise-grade reliability with instant alert notifications</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-zinc-900 p-3 rounded-xl group-hover:bg-zinc-800 transition-colors">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Predictions</h3>
                  <p className="text-sm text-zinc-400">Identify potential issues before they impact your users</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex items-center gap-8 pt-8 border-t border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-2xl font-bold">10K+</span>
            </div>
            <p className="text-sm text-zinc-400">Active developers</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              <span className="text-2xl font-bold">1M+</span>
            </div>
            <p className="text-sm text-zinc-400">Deployments monitored</p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="bg-zinc-950 dark:bg-white p-2.5 rounded-xl">
              <Sparkles className="h-6 w-6 text-white dark:text-zinc-950" />
            </div>
            <span className="text-xl font-bold">DeployMonitor</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Sign in to your account</h1>
            <p className="text-muted-foreground">Start monitoring your deployments today</p>
          </div>

          <LoginForm />

          {/* Mobile features - shown only on small screens */}
          <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl lg:hidden">
            <h3 className="font-semibold mb-4 text-center">Why developers choose us</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>Real-time analytics & insights</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-green-100 dark:bg-green-950 p-2 rounded-lg">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span>99.9% uptime monitoring</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-yellow-100 dark:bg-yellow-950 p-2 rounded-lg">
                  <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span>AI-powered predictions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
