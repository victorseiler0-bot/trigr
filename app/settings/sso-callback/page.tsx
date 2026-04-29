"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SettingsSSOCallback() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-zinc-500 text-sm animate-pulse">Connexion du compte…</div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/settings"
        signUpForceRedirectUrl="/settings"
        continueSignUpUrl="/settings"
      />
    </div>
  );
}
