import type { ReactNode } from "react";
import SalesCrmLogo from "./SalesCrmLogo";

/**
 * One highlighted capability in the hero list.
 *
 * `icon` is the decorative glyph and `tileClass` its coloured backdrop —
 * both are data so the list below stays a single map instead of three
 * hand-copied blocks.
 */
type HeroFeature = {
  icon: ReactNode;
  tileClass: string;
  title: string;
  description: string;
};

const FEATURES: HeroFeature[] = [
  {
    icon: (
      <svg
        className="w-[26px] h-[26px] text-[#0062ff]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 6a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM8.5 11.5c-3.1 0-5.5 2-5.5 4.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1c0-2.5-2.4-4.5-5.5-4.5zM17.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM15 12.2c.8.3 1.5.8 2 1.4.9.9 1.5 2 1.5 3.4v1a1 1 0 0 1-1 1h-2.2v-1c0-1.8-.8-3.4-2.1-4.4.6-.2 1.2-.4 1.8-.4z" />
      </svg>
    ),
    tileClass: "bg-[#e0ecfe]",
    title: "Manage Leads",
    description: "Keep all your prospects in one place",
  },
  {
    icon: (
      <svg
        className="w-[26px] h-[26px] text-[#1ac7a5]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="14" width="3.5" height="7" rx="1.5" />
        <rect x="7.5" y="10" width="3.5" height="11" rx="1.5" />
        <rect x="13" y="6" width="3.5" height="15" rx="1.5" />
        <rect x="18.5" y="2" width="3.5" height="19" rx="1.5" />
      </svg>
    ),
    tileClass: "bg-[#e2f9f2]",
    title: "Track Deals",
    description: "Visualize your pipeline and close faster",
  },
  {
    icon: (
      <svg
        className="w-[26px] h-[26px] text-[#895af4]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="9 12 11 14 15 9" />
      </svg>
    ),
    tileClass: "bg-[#ece6fd]",
    title: "Grow Revenue",
    description: "Make data-driven decisions",
  },
];

/**
 * The marketing half of the login screen: brand, headline and the three
 * capability highlights.
 *
 * Purely presentational — the parent (`pages/login/Login.tsx`) owns the
 * form and everything it needs. Markup is a real list so screen readers
 * announce the three highlights as a set, and every glyph is marked
 * decorative so it is not read out loud.
 */
export default function LoginHero() {
  return (
    <div className="flex flex-col self-stretch lg:self-auto max-w-xl">
      {/* Brand mark */}
      <div className="mb-8 lg:mb-[80px]">
        <div className="flex items-center">
          <SalesCrmLogo size="lg" />
        </div>
      </div>

      {/* Eyebrow */}
      <div className="text-[12px] font-bold tracking-[0.25em] text-[#64748b] uppercase select-none">
        ORGANIZE &nbsp;&middot;&nbsp; TRACK &nbsp;&middot;&nbsp; CLOSE &nbsp;&middot;&nbsp; GROW
      </div>

      {/* Main Heading */}
      <h1 className="mt-[16px] text-[40px] sm:text-[48px] lg:text-[52px] font-extrabold text-[#0f172a] tracking-tight leading-[1.08]">
        Turn Leads
        <br />
        Into Lasting
        <br />
        <span className="text-[#0062ff]">Relationships</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-[18px] text-[15px] sm:text-[16px] text-[#475569] leading-[1.5] max-w-[420px] font-normal">
        A simple and powerful CRM to manage
        <br className="hidden sm:inline" /> your leads, deals, and customers.
      </p>

      {/* 3 Features */}
      <ul className="mt-[50px] space-y-[21px]">
        {FEATURES.map(({ icon, tileClass, title, description }) => (
          <li key={title} className="flex items-center gap-[18px]">
            <div
              className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 ${tileClass}`}
            >
              {icon}
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-snug">
                {title}
              </h2>
              <p className="text-[13px] text-[#64748b] leading-snug mt-0.5">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
