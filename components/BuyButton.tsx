"use client";
import { useState } from "react";

interface BuyButtonProps {
  productId: string;
  withInstall?: boolean;
  label?: string;
}

export default function BuyButton({ productId, withInstall = false, label = "Obtenir →" }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, withInstall }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          ...
        </span>
      ) : label}
    </button>
  );
}
