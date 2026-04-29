import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-6 py-16">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Trig<span className="text-violet-400">r</span></span>
          </Link>
        </div>

        <SignIn
          routing="hash"
          signUpUrl="/signup"
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#7c3aed",
              colorBackground: "#09090b",
              colorInputBackground: "rgba(255,255,255,0.04)",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#a1a1aa",
              borderRadius: "0.75rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              rootBox: "w-full",
              card: "bg-white/[0.03] border border-white/[0.08] shadow-none backdrop-blur-sm",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-zinc-500",
              socialButtonsBlockButton:
                "bg-white hover:bg-zinc-100 text-zinc-900 border-0 font-semibold",
              dividerLine: "bg-white/[0.08]",
              dividerText: "text-zinc-600",
              formFieldLabel: "text-zinc-400 text-xs font-medium",
              formFieldInput:
                "bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/60 text-white placeholder:text-zinc-600 rounded-xl",
              formButtonPrimary:
                "bg-violet-600 hover:bg-violet-500 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] font-semibold",
              footerActionText: "text-zinc-600",
              footerActionLink: "text-violet-400 hover:text-violet-300 font-medium",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-violet-400",
              formFieldSuccessText: "text-violet-300",
              alertText: "text-red-400",
            },
          }}
        />

        <p className="text-center text-xs text-zinc-700 mt-4">
          En continuant, vous acceptez nos{" "}
          <Link href="/terms" className="hover:text-zinc-500 underline underline-offset-2">CGU</Link>
          {" "}et notre{" "}
          <Link href="/privacy" className="hover:text-zinc-500 underline underline-offset-2">Politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  );
}
