import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-6 py-16">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
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

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-white/[0.08]">
          <h1 className="text-2xl font-bold text-white text-center mb-1">Bienvenue</h1>
          <p className="text-zinc-500 text-sm text-center mb-8">Connectez-vous à votre assistant IA</p>

          {/* Google OAuth */}
          <button className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm px-4 py-3 rounded-xl transition-all mb-6">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-zinc-600">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Email + password form */}
          <form className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Adresse email</label>
              <input
                type="email"
                placeholder="vous@exemple.fr"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-zinc-400 font-medium">Mot de passe</label>
                <Link href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Mot de passe oublié ?</Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
            >
              Se connecter
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300 transition-colors">
            Essai gratuit 7 jours →
          </Link>
        </p>

        <p className="text-center text-xs text-zinc-700 mt-3">
          En continuant, vous acceptez nos{" "}
          <Link href="/terms" className="hover:text-zinc-500 underline underline-offset-2">CGU</Link>
          {" "}et notre{" "}
          <Link href="/privacy" className="hover:text-zinc-500 underline underline-offset-2">Politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  );
}
