import SalesCrmLogo from "./SalesCrmLogo";

export default function LoginHero() {
  return (
    <div
      className="relative flex flex-col h-full w-full overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #e8f1ff 0%, #eef4ff 40%, #e4efff 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-28 -right-28 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(191,219,254,0.6) 0%, rgba(219,234,254,0.4) 45%, transparent 70%)" }} />
        <div className="absolute -bottom-36 -left-24 w-[440px] h-[440px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(147,197,253,0.45) 0%, rgba(191,219,254,0.3) 55%, transparent 75%)" }} />
        <svg className="absolute bottom-44 left-8 opacity-30" width="88" height="88" viewBox="0 0 88 88">
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
            <circle key={`bl-${r}-${c}`} cx={c * 18 + 9} cy={r * 18 + 9} r="2.2" fill="#7bb3da" />
          )))}
        </svg>
        <svg className="absolute top-[38%] right-8 opacity-25" width="88" height="88" viewBox="0 0 88 88">
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
            <circle key={`tr-${r}-${c}`} cx={c * 18 + 9} cy={r * 18 + 9} r="2.2" fill="#7bb3da" />
          )))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-10 pt-10 pb-6 lg:px-14 lg:pt-12">

        {/* Logo */}
        <div className="mb-9">
          <SalesCrmLogo size="lg" height="clamp(28px, min(5vh,3.8vw), 42px)" />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center self-start rounded-full border border-blue-200 bg-white/75 px-3.5 py-1 text-[11px] font-bold tracking-[0.14em] uppercase text-blue-600 mb-5 shadow-sm">
          Sales CRM
        </span>

        {/* Headline */}
        <h1 className="text-[clamp(30px,min(5.4vh,4vw),50px)] font-extrabold text-slate-900 leading-[1.1] tracking-tight">
          Manage Leads<br />
          Grow Your <span className="text-blue-600">Business</span>
        </h1>

        {/* Sub-copy */}
        <p className="mt-4 text-[15px] text-slate-500 leading-[1.65] max-w-[380px]">
          Track leads, manage contacts, close deals<br />
          and achieve your sales goals — all in one place.
        </p>

        {/* ── Mockup area with floating outside graphs ── */}
        <div className="mt-8 flex-1 min-h-0 relative">

          {/* OUTSIDE GRAPH 1: Deal Progress bar chart — floats top-right outside the card */}
          <div
            className="absolute -top-5 right-2 z-20 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.14)] px-4 py-3"
            style={{ minWidth: 152 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-700">Deal Progress</span>
              <span className="text-[9px] font-bold text-violet-600 bg-violet-50 rounded-full px-1.5 py-0.5">↑ 18%</span>
            </div>
            <svg width="120" height="38" viewBox="0 0 120 38" aria-hidden="true">
              {[
                { x: 2,   h: 18, c: "#c4b5fd" },
                { x: 16,  h: 26, c: "#a78bfa" },
                { x: 30,  h: 20, c: "#c4b5fd" },
                { x: 44,  h: 32, c: "#7c3aed" },
                { x: 58,  h: 22, c: "#a78bfa" },
                { x: 72,  h: 36, c: "#6d28d9" },
                { x: 86,  h: 28, c: "#a78bfa" },
                { x: 100, h: 38, c: "#5b21b6" },
              ].map((b, i) => (
                <rect key={i} x={b.x} y={38 - b.h} width="11" height={b.h} rx="3" fill={b.c} />
              ))}
            </svg>
            <div className="text-[10px] text-slate-400 mt-1">8 active deals</div>
          </div>

          {/* OUTSIDE GRAPH 2: Revenue Trend line chart — floats bottom-right outside the card */}
          <div
            className="absolute -bottom-5 right-2 z-20 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.14)] px-4 py-3"
            style={{ minWidth: 168 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-700">Revenue Trend</span>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">↑ 22%</span>
            </div>
            <div className="text-[20px] font-bold text-slate-900 leading-none mb-2">$84.2k</div>
            <svg width="136" height="32" viewBox="0 0 136 32" aria-hidden="true">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,28 C14,26 24,22 40,17 C56,12 66,19 82,13 C98,7 112,5 136,2"
                fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"
              />
              <path
                d="M0,28 C14,26 24,22 40,17 C56,12 66,19 82,13 C98,7 112,5 136,2 L136,32 L0,32Z"
                fill="url(#revGrad)"
              />
              <circle cx="82" cy="13" r="3.5" fill="white" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>

          {/* Main dashboard card */}
          <div
            className="rounded-2xl bg-white shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden"
            style={{ maxWidth: 560 }}
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
                    <svg width="100%" height="72" viewBox="0 0 280 72" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,66 C20,64 35,58 55,54 C75,50 90,57 115,48 C140,40 160,24 190,22 C215,20 235,30 255,24 C265,21 272,18 280,14"
                        fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                      <path d="M0,66 C20,64 35,58 55,54 C75,50 90,57 115,48 C140,40 160,24 190,22 C215,20 235,30 255,24 C265,21 272,18 280,14 L280,72 L0,72Z"
                        fill="url(#cg)" />
                      <circle cx="190" cy="22" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Right: mini stat cards */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* New Leads with sparkline */}
                  <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-3 py-2 flex items-start gap-2.5">
                    <div>
                      <div className="text-[10px] text-slate-400 leading-none mb-0.5">New Leads</div>
                      <div className="text-[20px] font-bold text-slate-900 leading-none">86</div>
                      <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">↑ 8%</div>
                    </div>
                    <svg width="48" height="30" viewBox="0 0 48 30" className="self-end mb-0.5" aria-hidden="true">
                      <defs>
                        <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,26 L10,20 L20,22 L30,12 L40,8 L48,4" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M0,26 L10,20 L20,22 L30,12 L40,8 L48,4 L48,30 L0,30Z" fill="url(#sg1)" />
                    </svg>
                  </div>

                  {/* Qualified + Converted with sparklines */}
                  <div className="flex gap-2">
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-2.5 py-2 min-w-0">
                      <div className="text-[9px] text-slate-400 leading-none mb-0.5">Qualified</div>
                      <div className="text-[17px] font-bold text-slate-900 leading-none">42</div>
                      <div className="text-[9px] text-amber-500 font-semibold mt-0.5">↑ 25%</div>
                      <svg width="52" height="22" viewBox="0 0 52 22" className="mt-1" aria-hidden="true">
                        <defs>
                          <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,18 L9,14 L18,16 L27,10 L36,7 L44,4 L52,2" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M0,18 L9,14 L18,16 L27,10 L36,7 L44,4 L52,2 L52,22 L0,22Z" fill="url(#sg2)" />
                      </svg>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-2.5 py-2 min-w-0">
                      <div className="text-[9px] text-slate-400 leading-none mb-0.5">Converted</div>
                      <div className="text-[17px] font-bold text-slate-900 leading-none">28</div>
                      <div className="text-[9px] text-emerald-500 font-semibold mt-0.5">↑ 30%</div>
                      <svg width="52" height="22" viewBox="0 0 52 22" className="mt-1" aria-hidden="true">
                        <defs>
                          <linearGradient id="sg3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,20 L9,17 L18,18 L27,13 L36,9 L44,5 L52,2" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M0,20 L9,17 L18,18 L27,13 L36,9 L44,5 L52,2 L52,22 L0,22Z" fill="url(#sg3)" />
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
                      style={{ color: r.sc, background: r.sb }}>
                      {r.st}
                    </span>
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
      {/* end content */}

    </div>
  );
}
