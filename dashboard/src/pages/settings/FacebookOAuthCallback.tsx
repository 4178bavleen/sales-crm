import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCw, UserRound } from "lucide-react";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

type PageOption = { id: string; name: string };

type ExchangeResult = {
  sessionId: string;
  user: { id: string | null; name: string | null };
  pages: PageOption[];
};

export default function FacebookOAuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [selectedPage, setSelectedPage] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setError(oauthError);
      setLoading(false);
      return;
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setError("Facebook did not return a valid authorization code. Please try again.");
      setLoading(false);
      return;
    }

    const token = getSession()?.token;
    if (!token) {
      setError("Your session has expired. Please log in and try again.");
      setLoading(false);
      return;
    }

    request<any>(ENDPOINTS.settings.facebookOAuthExchange, {
      method: "POST",
      token,
      body: { code, state },
    })
      .then((res) => {
        const data: ExchangeResult | undefined = res?.data ?? res;
        if (!data?.sessionId || !Array.isArray(data.pages)) {
          throw new Error("Invalid response from the Facebook connection service.");
        }
        setResult(data);
        setSelectedPage(data.pages[0]?.id ?? "");
      })
      .catch((err: any) => {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to connect your Facebook account.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPage = async () => {
    if (!result?.sessionId || !selectedPage) return;
    const token = getSession()?.token;
    if (!token) return;

    try {
      setConnecting(true);
      setError(null);
      const res = await request<any>(ENDPOINTS.settings.facebookOAuthSelectPage, {
        method: "POST",
        token,
        body: { sessionId: result.sessionId, pageId: selectedPage },
      });
      const message =
        res?.message ||
        "Facebook Page connected successfully. Lead webhook subscription updated.";
      sessionStorage.setItem("fb_oauth_result", message);
      navigate("/settings");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to connect the selected Page.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <UserRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Connect Facebook Lead Ads
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Choose the Facebook Page that owns your lead forms.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800">
            <RotateCw size={18} className="animate-spin" />
            <span>Verifying authorization with Meta...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {result && (
          <div className="space-y-5">
            {result.user?.name && (
              <p className="text-xs text-slate-500">
                Connected as <strong className="text-slate-700">{result.user.name}</strong>
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Page
              </label>
              <select
                value={selectedPage}
                onChange={(event) => setSelectedPage(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                {result.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name} — {page.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelectPage}
                disabled={connecting || !selectedPage}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {connecting ? <RotateCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Connect Page
              </button>
            </div>
          </div>
        )}

        {error && !loading && (
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </button>
        )}
      </div>
    </div>
  );
}
