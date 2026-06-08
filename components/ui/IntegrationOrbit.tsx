"use client";

import { useEffect, useRef } from "react";

const ORBIT_ICONS = [
  // Orbit 1 — Communication
  { name: "Gmail",     bg: "#EA4335", svg: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="white"/></svg> },
  { name: "WhatsApp",  bg: "#25D366", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> },
  { name: "Instagram", bg: "#E1306C", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
  { name: "Calendar",  bg: "#4285F4", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg> },

  // Orbit 2 — Productivité
  { name: "Notion",    bg: "#191919", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg> },
  { name: "Slack",     bg: "#4A154B", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg> },
  { name: "GitHub",    bg: "#24292F", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
  { name: "HubSpot",   bg: "#FF7A59", svg: <svg viewBox="0 0 512 512" width="20" height="20" fill="white"><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 490 173.9 490s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7z"/></svg> },

  // Orbit 3 — Business
  { name: "Stripe",    bg: "#635BFF", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg> },
  { name: "Airtable",  bg: "#FFBF00", svg: <svg viewBox="0 0 200 170" width="20" height="20"><path d="M90 12L24 38c-4 2-4 8 0 10l66 25c6 2 13 2 19 0l66-25c4-2 4-8 0-10L109 12c-6-2-13-2-19 0z"/><path d="M105 95v68c0 3 3 5 6 4l74-29c2-1 3-2 3-4V67c0-3-3-5-6-4L108 91c-2 1-3 2-3 4z" fill="#18BFFF"/><path d="M88 99l-22-10-3-1L19 69c-3-1-6 1-6 4v68c0 2 1 3 3 4l7 4 60 31c3 2 7-1 7-4v-73c0-2-1-3-3-4z" fill="#F82B60"/></svg> },
  { name: "Linear",    bg: "#5E6AD2", svg: <svg viewBox="0 0 100 100" width="20" height="20"><circle cx="50" cy="50" r="50" fill="#5E6AD2"/><path d="M17.68 62.99L37 82.32a41.06 41.06 0 01-19.32-19.33zM15 54.09L45.91 85a40.99 40.99 0 01-6.55-1.26L16.26 60.65A40.88 40.88 0 0115 54.1zM85 45.91L54.09 15a41.06 41.06 0 0130.91 30.91zM82.32 37L37.01 82.32a41.08 41.08 0 01-19.33-19.33L62.99 17.68A41.06 41.06 0 0182.32 37zM62.99 17.68L17.68 62.99a41 41 0 01-1.42-6.9L56.09 16.26a40.9 40.9 0 016.9 1.42z" fill="white"/></svg> },
  { name: "Zoom",      bg: "#2D8CFF", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M4.5 4.5h15A4.5 4.5 0 0124 9v6a4.5 4.5 0 01-4.5 4.5h-15A4.5 4.5 0 010 15V9A4.5 4.5 0 014.5 4.5zm12 3v9l6-3V10.5l-6-3z"/></svg> },
];

const ORBITS = [
  { icons: ORBIT_ICONS.slice(0, 4),  size: 200, speed: 25 },
  { icons: ORBIT_ICONS.slice(4, 8),  size: 310, speed: 35 },
  { icons: ORBIT_ICONS.slice(8, 12), size: 420, speed: 50 },
];

export default function IntegrationOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative overflow-hidden py-24 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">

        {/* Left — texte */}
        <div className="flex-1 z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            20+ intégrations natives
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Connecte tous tes outils<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">en un seul endroit</span>
          </h2>
          <p className="text-zinc-400 text-base mb-8 max-w-md">
            Gmail, WhatsApp, Notion, Slack, GitHub, Stripe — Orbe unifie ton stack et automatise à ta place. RGPD-friendly, hébergé en Europe.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/assistant" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              Essayer gratuitement →
            </a>
            <a href="/integrations" className="border border-white/[0.10] text-zinc-300 hover:text-white hover:border-white/20 font-medium px-5 py-2.5 rounded-xl transition-all text-sm">
              Voir toutes les intégrations
            </a>
          </div>

          <div className="flex items-center gap-6 mt-8">
            {[["Gmail", "#EA4335"], ["WhatsApp", "#25D366"], ["Notion", "#888"]].map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-zinc-500">{name}</span>
              </div>
            ))}
            <span className="text-xs text-zinc-600">+ 17 autres</span>
          </div>
        </div>

        {/* Right — orbites */}
        <div ref={containerRef} className="relative flex-shrink-0 w-[480px] h-[480px] flex items-center justify-center">
          {/* Centre */}
          <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] z-10">
            <span className="text-white font-black text-2xl">A</span>
          </div>

          {ORBITS.map(({ icons, size, speed }, oi) => (
            <div
              key={oi}
              className="absolute rounded-full border border-white/[0.05]"
              style={{
                width: size,
                height: size,
                animation: `orbit-spin ${speed}s linear infinite`,
              }}
            >
              {icons.map((icon, ii) => {
                const angle = (ii / icons.length) * 2 * Math.PI - Math.PI / 2;
                const x = 50 + 50 * Math.cos(angle);
                const y = 50 + 50 * Math.sin(angle);
                return (
                  <div
                    key={icon.name}
                    title={icon.name}
                    className="absolute w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      background: icon.bg,
                      animation: `orbit-counter ${speed}s linear infinite`,
                    }}
                  >
                    {icon.svg}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-counter {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
      `}</style>
    </section>
  );
}
