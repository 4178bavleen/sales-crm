import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";
import LoginHero from "../../components/ui/LoginHero";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleLoginSubmit(values: LoginFormValues) {
    setPending(true);
    setError("");
    const result = await signIn(values);
    setPending(false);

    if (result.ok) {
      navigate(from, { replace: true });
      return;
    }
    setError(result.error);
  }

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col justify-start selection:bg-[#0062ff] selection:text-white overflow-x-hidden"
      style={{ backgroundImage: "url('/bg/login.png')" }}
    >
      <div className="w-full min-h-screen flex flex-col lg:flex-row items-start justify-between pl-6 sm:pl-12 lg:pl-[133px] pr-6 sm:pr-12 lg:pr-[254px] pt-8 lg:pt-[80px] pb-8 lg:pb-[120px] box-border gap-8 lg:gap-12">
        {/* Left Column / Hero Section */}
        <LoginHero />

        {/* Right Column / Elevated Login Card */}
        <div className="w-full max-w-[486px] lg:w-[486px] lg:h-[555px] lg:mt-[43px]">
          <div className="w-full h-full rounded-[24px] bg-white px-7 py-9 sm:px-[56px] sm:pt-[44px] sm:pb-[34px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100/70 animate-in fade-in zoom-in-95 duration-200 flex flex-col justify-between">
            <LoginForm
              onSubmit={handleLoginSubmit}
              error={error}
              pending={pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
