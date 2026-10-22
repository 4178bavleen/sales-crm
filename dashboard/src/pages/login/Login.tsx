import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";
import LoginHero from "../../components/ui/LoginHero";
import SalesCrmLogo from "../../components/ui/SalesCrmLogo";
import "./login-responsive.css";

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
    <div className="flex min-h-screen h-[100dvh] w-full overflow-hidden selection:bg-[#2563eb] selection:text-white">
      {/* LEFT: hero panel */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[58%] shrink-0 h-full">
        <LoginHero />
      </div>
      {/* RIGHT: white form panel */}
      <div className="login-form-panel flex flex-1 items-center justify-center bg-white h-full px-8 py-10 sm:px-14 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-[420px] my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* The brand mark lives in the hero panel, which is hidden on small
              screens — so it is repeated here for tablet/phone viewports. */}
          <div className="login-mobile-logo lg:hidden mb-8">
            <SalesCrmLogo size="lg" height="clamp(28px, min(5vh,3.8vw), 42px)" />
          </div>
          <LoginForm onSubmit={handleLoginSubmit} error={error} pending={pending} />
        </div>
      </div>
    </div>
  );
}
