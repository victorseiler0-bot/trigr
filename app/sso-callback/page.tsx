"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-zinc-500 text-sm animate-pulse">Connexion en cours…</div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/assistant"
        signUpForceRedirectUrl="/assistant"
      />
    </div>
  );
}
