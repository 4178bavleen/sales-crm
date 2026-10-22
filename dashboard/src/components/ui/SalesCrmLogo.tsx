interface SalesCrmLogoProps {
  className?: string;
  size?: "default" | "lg";
}

export default function SalesCrmLogo({
  className = "",
  size = "default",
}: SalesCrmLogoProps) {
  const isLg = size === "lg";
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 3 Rising vertical rounded bars in vibrant blue */}
      <svg
        className={isLg ? "w-[24px] h-[28px] text-[#0062ff]" : "w-5 h-6 text-[#0062ff]"}
        viewBox="0 0 24 28"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0.5" y="15" width="5.5" height="13" rx="2.75" />
        <rect x="9.5" y="8" width="5.5" height="20" rx="2.75" />
        <rect x="18.5" y="0.5" width="5.5" height="27.5" rx="2.75" />
      </svg>
      <span
        className={`${
          isLg ? "text-[21px]" : "text-[18px]"
        } font-bold tracking-tight text-slate-900 font-sans`}
      >
        Sales CRM
      </span>
    </div>
  );
}
