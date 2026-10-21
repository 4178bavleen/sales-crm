export default function SalesCrmLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 3 Rising vertical rounded bars in bright blue */}
      <svg
        className="w-5 h-5 text-blue-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="11" width="3.5" height="7" rx="1.5" />
        <rect x="8.2" y="7" width="3.5" height="11" rx="1.5" />
        <rect x="14.5" y="2" width="3.5" height="16" rx="1.5" />
      </svg>
      <span className="text-[17px] font-bold tracking-tight text-slate-900 font-sans">
        Sales CRM
      </span>
    </div>
  );
}
