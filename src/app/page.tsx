"use client";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/auth-client";
import { useCallback, useState } from "react";

export default function Home() {

  const [_loading, setLoading] = useState(false);

  const _signIn = useCallback(async (provider: "google" | "github") => {
    try {
      setLoading(true);
      await signIn.social({
        provider: provider,
        callbackURL: '/',
      });
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return (
    <div>
      <Button disabled={_loading} onClick={() => _signIn('google')}>Sign in with Google</Button>
      <Button disabled={_loading} onClick={() => _signIn('github')}>Sign in with GitHub</Button>
    </div>
  );
}
