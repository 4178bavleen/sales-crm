import SalesCrmLogo from "./SalesCrmLogo";

export default function LoginHero() {
  return (
    <div
      className="relative flex flex-col h-full w-full select-none"
      style={{ background: "linear-gradient(135deg, #e8f1ff 0%, #eef4ff 40%, #e4efff 100%)", overflow: "hidden" }}
    >
      {/* ── Decorative blobs ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-28 -right-28 w-[520px] h-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(191,219,254,0.65) 0%, rgba(219,234,254,0.4) 45%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-28 w-[460px] h-[460px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(191,219,254,0.3) 55%, transparent 75%)" }} />
        <svg className="absolute bottom-48 left-8 opacity-30" width="88" height="88" viewBox="0 0 88 88">
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
            <circle key={`a${r}${c}`} cx={c * 18 + 9} cy={r * 18 + 9} r="2.2" fill="#7bb3da" />
          )))}
        </svg>
        <svg className="absolute top-[36%] right-6 opacity-20" width="80" height="80" viewBox="0 0 80 80">
          {Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => (
            <circle key={`b${r}${c}`} cx={c * 20 + 10} cy={r * 20 + 10} r="2.2" fill="#7bb3da" />
          )))}
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col h-full px-10 pt-10 pb-6 lg:px-14 lg:pt-12" style={{ overflow: "visible" }}>

        {/* Logo */}
        <div className="mb-8 shrink-0">
          <SalesCrmLogo size="lg" height="clamp(28px, min(5vh,3.8vw), 42px)" />
        </div>

        {/* Headline */}
        <h1 className="shrink-0 text-[clamp(28px,min(5.2vh,3.8vw),48px)] font-extrabold text-slate-900 leading-[1.1] tracking-tight">
          Manage Leads<br />
          Grow Your <span className="text-blue-600">Business</span>
        </h1>

        {/* Sub-copy */}
        <p className="shrink-0 mt-3 text-[14.5px] text-slate-500 leading-[1.65] max-w-[360px]">
          Track leads, manage contacts, close deals<br />
          and achieve your sales goals — all in one place.
        </p>

        {/* ── Mockup + floating graphs ── */}
        <div className="mt-7 flex-1 min-h-0 relative">

          {/* ════════════════════════════════════════
              FLOATING GRAPH 1 — Deal Progress
              Large purple bar chart, top-RIGHT,
              clearly outside & above the main card
              ════════════════════════════════════════ */}
          <div
            className="absolute z-30 rounded-2xl bg-white border border-slate-100 px-5 py-4"
            style={{
              top: -105,
              right: 150,
              width: 210,
              boxShadow: "rgba(0, 0, 0, 0.48) 0px 12px 40px, rgba(0, 0, 0, 0.08) 0px 2px 8px"
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold text-slate-800">Deal Progress</span>
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">↑ 18%</span>
            </div>
            {/* Bar chart SVG */}
            <svg width="170" height="56" viewBox="0 0 170 56" aria-hidden="true">
              {[
                { x: 2,   h: 22, c: "#ddd6fe" },
                { x: 24,  h: 32, c: "#c4b5fd" },
                { x: 46,  h: 26, c: "#ddd6fe" },
                { x: 68,  h: 40, c: "#a78bfa" },
                { x: 90,  h: 30, c: "#c4b5fd" },
                { x: 112, h: 48, c: "#7c3aed" },
                { x: 134, h: 38, c: "#a78bfa" },
                { x: 156, h: 56, c: "#5b21b6" },
              ].map((b, i) => (
                <rect key={i} x={b.x} y={56 - b.h} width="16" height={b.h} rx="4" fill={b.c} />
              ))}
            </svg>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400">8 active deals</span>
              <span className="text-[13px] font-bold text-slate-800">64%</span>
            </div>
          </div>

          {/* ════════════════════════════════════════
              FLOATING GRAPH 2 — Revenue Trend
              Large green area chart, bottom-LEFT,
              clearly outside & below the main card
              ════════════════════════════════════════ */}
          <div
            className="absolute z-30 rounded-2xl bg-white border border-slate-100 px-5 py-4"
            style={{
              bottom: 128,
              left: -18,
              width: 226,
              boxShadow: "rgba(0, 0, 0, 0.77) 0px 12px 40px, rgba(0, 0, 0, 0.08) 0px 2px 8px"
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-slate-800">Revenue Trend</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">↑ 22%</span>
            </div>
            <div className="text-[26px] font-bold text-slate-900 leading-tight mb-2">$84.2k</div>
            {/* Area chart SVG */}
            <svg width="186" height="48" viewBox="0 0 186 48" aria-hidden="true">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,42 C18,40 30,34 50,28 C70,22 84,30 104,22 C124,14 144,10 166,6 C172,5 178,4 186,2"
                fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"
              />
              <path
                d="M0,42 C18,40 30,34 50,28 C70,22 84,30 104,22 C124,14 144,10 166,6 C172,5 178,4 186,2 L186,48 L0,48Z"
                fill="url(#revGrad)"
              />
              <circle cx="104" cy="22" r="4.5" fill="white" stroke="#10b981" strokeWidth="2.2" />
            </svg>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-400">vs last month</span>
              <span className="text-[11px] font-semibold text-emerald-600">+$15.1k</span>
            </div>
          </div>

          {/* ── Main dashboard mockup card ── */}
          <div
            className="rounded-2xl bg-white border border-slate-100 overflow-hidden"
            style={{
              maxWidth: 500,
              marginLeft: 190,
              marginRight: 24,
              boxShadow: "0 16px_56px_rgba(0,0,0,0.13)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>

            <div className="px-5 pt-4 pb-4">
              {/* Stats row */}
              <div className="flex gap-4 mb-3">
                {/* Left: total leads + main chart */}
                <div className="flex-1 min-w-0">
                  <div className="text-[26px] font-bold text-slate-900 leading-none">248</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Total Leads</div>
                  <div className="text-[11px] text-emerald-500 font-semibold mt-0.5">↑ 12%</div>
                  <div className="mt-3">
                    <svg width="100%" height="68" viewBox="0 0 260 68" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,62 C18,60 32,54 52,50 C72,46 86,53 108,44 C130,36 150,22 175,20 C198,18 218,28 238,22 C247,19 253,16 260,12"
                        fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                      <path d="M0,62 C18,60 32,54 52,50 C72,46 86,53 108,44 C130,36 150,22 175,20 C198,18 218,28 238,22 C247,19 253,16 260,12 L260,68 L0,68Z"
                        fill="url(#mainGrad)" />
                      <circle cx="175" cy="20" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Right: mini stat cards */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* New Leads */}
                  <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-3 py-2 flex items-start gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 leading-none mb-0.5">New Leads</div>
                      <div className="text-[19px] font-bold text-slate-900 leading-none">86</div>
                      <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">↑ 8%</div>
                    </div>
                    <svg width="44" height="28" viewBox="0 0 44 28" className="self-end mb-0.5" aria-hidden="true">
                      <defs>
                        <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,24 L8,18 L18,20 L28,11 L36,7 L44,3" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M0,24 L8,18 L18,20 L28,11 L36,7 L44,3 L44,28 L0,28Z" fill="url(#sg1)" />
                    </svg>
                  </div>

                  {/* Qualified + Converted */}
                  <div className="flex gap-2">
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-2.5 py-2 min-w-0">
                      <div className="text-[9px] text-slate-400 leading-none mb-0.5">Qualified</div>
                      <div className="text-[16px] font-bold text-slate-900 leading-none">42</div>
                      <div className="text-[9px] text-amber-500 font-semibold mt-0.5">↑ 25%</div>
                      <svg width="48" height="20" viewBox="0 0 48 20" className="mt-1" aria-hidden="true">
                        <defs>
                          <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,16 L8,12 L16,14 L24,8 L32,5 L40,3 L48,1" fill="none" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M0,16 L8,12 L16,14 L24,8 L32,5 L40,3 L48,1 L48,20 L0,20Z" fill="url(#sg2)" />
                      </svg>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-2.5 py-2 min-w-0">
                      <div className="text-[9px] text-slate-400 leading-none mb-0.5">Converted</div>
                      <div className="text-[16px] font-bold text-slate-900 leading-none">28</div>
                      <div className="text-[9px] text-emerald-500 font-semibold mt-0.5">↑ 30%</div>
                      <svg width="48" height="20" viewBox="0 0 48 20" className="mt-1" aria-hidden="true">
                        <defs>
                          <linearGradient id="sg3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,18 L8,15 L16,16 L24,11 L32,8 L40,4 L48,1" fill="none" stroke="#10b981" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M0,18 L8,15 L16,16 L24,11 L32,8 L40,4 L48,1 L48,20 L0,20Z" fill="url(#sg3)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Leads table */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                  <span className="text-[11px] font-semibold text-slate-700">Recent Leads</span>
                </div>
                <div className="grid px-3 py-1.5 text-[9px] font-medium text-slate-400 border-b border-slate-100"
                  style={{ gridTemplateColumns: "2fr 2fr 1.1fr 1.5fr" }}>
                  <span>Name</span><span>Company</span><span>Status</span><span>Date</span>
                </div>
                {[
                  { i: "CM", bg: "#dbeafe", fg: "#1d4ed8", name: "Christopher Macleod", co: "Rangoni Of Florence",  st: "New",       sc: "#2563eb", sb: "#eff6ff", date: "Oct 19, 2026" },
                  { i: "CK", bg: "#d1fae5", fg: "#065f46", name: "Carissa Kidman",       co: "Oh My Goodknits Inc", st: "Contacted", sc: "#0369a1", sb: "#f0f9ff", date: "Oct 18, 2026" },
                  { i: "JM", bg: "#ede9fe", fg: "#6d28d9", name: "James Merced",         co: "Kwik Kopy Printing",  st: "Qualified", sc: "#059669", sb: "#ecfdf5", date: "Oct 17, 2026" },
                ].map((r) => (
                  <div key={r.i} className="grid items-center px-3 py-2 border-b border-slate-50 last:border-0"
                    style={{ gridTemplateColumns: "2fr 2fr 1.1fr 1.5fr" }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{ background: r.bg, color: r.fg }}>
                        {r.i}
                      </span>
                      <span className="text-[10px] text-slate-700 truncate">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate pr-2">{r.co}</span>
                    <span className="text-[9px] font-medium rounded-full px-1.5 py-0.5 inline-block whitespace-nowrap"
                      style={{ color: r.sc, background: r.sb }}>{r.st}</span>
                    <span className="text-[9px] text-slate-400">{r.date}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
          {/* end main card */}

        </div>
        {/* end mockup area */}

      </div>
    </div>
  );
}
