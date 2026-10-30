import { useEffect, useRef, useState } from "react";
import {
  Delete,
  Mic,
  MicOff,
  Minus,
  PhoneCall,
  PhoneOff,
  Volume2,
  X,
} from "lucide-react";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

interface WebPhoneProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  initialNumber?: string;
  contactName?: string;
  leadId?: number | null;
  dealId?: number | null;
  extension?: string;
  onCallLogged?: () => void;
}

const KEYPAD_BUTTONS = [
  { digit: "1", subtext: "~" },
  { digit: "2", subtext: "ABC" },
  { digit: "3", subtext: "DEF" },
  { digit: "4", subtext: "GHI" },
  { digit: "5", subtext: "JKL" },
  { digit: "6", subtext: "MNO" },
  { digit: "7", subtext: "PQRS" },
  { digit: "8", subtext: "TUV" },
  { digit: "9", subtext: "WXYZ" },
  { digit: "*", subtext: "" },
  { digit: "0", subtext: "+" },
  { digit: "#", subtext: "" },
];

export default function WebPhone({
  isOpen,
  onClose,
  onMinimize,
  initialNumber = "",
  contactName = "",
  leadId = null,
  dealId = null,
  extension = "1012",
  onCallLogged,
}: WebPhoneProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [callState, setCallState] = useState<"idle" | "dialing" | "connected" | "ended">("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callOutcome, setCallOutcome] = useState("Connected - Positive");
  const [callNotes, setCallNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialNumber) {
      setPhoneNumber(initialNumber);
    }
  }, [initialNumber]);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen) return null;

  function handleDigit(digit: string) {
    if (callState !== "idle") return;
    setPhoneNumber((prev) => prev + digit);
  }

  function handleBackspace() {
    if (callState !== "idle") return;
    setPhoneNumber((prev) => prev.slice(0, -1));
  }

  function handleStartCall() {
    if (!phoneNumber) return;
    setCallState("dialing");
    setCallDuration(0);

    // Simulate connection after brief ringing
    setTimeout(() => {
      setCallState("connected");
    }, 1800);
  }

  function handleEndCall() {
    setCallState("ended");
  }

  async function handleSaveLog() {
    const token = getSession()?.token;
    if (!token) return;

    try {
      setSavingLog(true);

      await request(ENDPOINTS.activities.create, {
        method: "POST",
        token,
        body: {
          type: "CALL",
          outcome: callOutcome || "Completed",
          notes: callNotes || null,
          occurredAt: new Date().toISOString(),
          leadId: leadId ?? null,
          dealId: dealId ?? null,
        },
      });

      if (onCallLogged) {
        onCallLogged();
      }
      setCallState("idle");
      setCallDuration(0);
      setCallNotes("");
      onClose();
    } catch (err) {
      console.error("Failed to log call:", err);
    } finally {
      setSavingLog(false);
    }
  }

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#121829] text-white shadow-2xl backdrop-blur-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-[#0d1220]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-tight text-white">WebPhone</span>
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
            {extension}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
            className="rounded p-1 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded p-1 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px] border-b border-slate-800/50 bg-[#151c30]">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              callState === "connected"
                ? "bg-emerald-400 animate-pulse"
                : callState === "dialing"
                ? "bg-amber-400 animate-ping"
                : callState === "ended"
                ? "bg-rose-400"
                : "bg-emerald-500"
            }`}
          />
          <span className="font-medium text-slate-300">
            {callState === "idle" && "Ready"}
            {callState === "dialing" && "Calling..."}
            {callState === "connected" && `Connected (${formatDuration(callDuration)})`}
            {callState === "ended" && "Call Ended"}
          </span>
        </div>
        {contactName && (
          <span className="max-w-[120px] truncate text-slate-400 text-[10px]" title={contactName}>
            {contactName}
          </span>
        )}
      </div>

      {callState === "ended" ? (
        /* Call Log Outcome Form */
        <div className="p-4 space-y-3 bg-[#111728]">
          <div className="text-center pb-1">
            <p className="text-xs font-semibold text-slate-200">Call Summary</p>
            <p className="text-[11px] text-slate-400">
              Duration: {formatDuration(callDuration)}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Call Outcome
            </label>
            <select
              value={callOutcome}
              onChange={(e) => setCallOutcome(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Connected - Positive">Connected - Positive</option>
              <option value="Connected - Follow-up Needed">Connected - Follow-up Needed</option>
              <option value="No Answer">No Answer</option>
              <option value="Busy">Busy</option>
              <option value="Left Voicemail">Left Voicemail</option>
              <option value="Meeting Scheduled">Meeting Scheduled</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Call Notes
            </label>
            <textarea
              rows={2}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Record notes about the call..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-indigo-500 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCallState("idle");
                setCallDuration(0);
              }}
              className="flex-1 rounded-lg border border-slate-700 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={savingLog}
              onClick={handleSaveLog}
              className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer"
            >
              {savingLog ? "Saving..." : "Save Log"}
            </button>
          </div>
        </div>
      ) : (
        /* Dialer & Keypad */
        <div className="p-3.5 space-y-3">
          {/* Number Input display */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2">
            <span className="text-sm select-none">🌐</span>
            <input
              type="text"
              value={phoneNumber}
              readOnly={callState !== "idle"}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter number..."
              className="w-full bg-transparent text-sm font-semibold text-white tracking-wide outline-none placeholder:text-slate-500"
            />
            {phoneNumber && callState === "idle" && (
              <button
                type="button"
                onClick={handleBackspace}
                className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Delete size={15} />
              </button>
            )}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {KEYPAD_BUTTONS.map(({ digit, subtext }) => (
              <button
                key={digit}
                type="button"
                disabled={callState !== "idle"}
                onClick={() => handleDigit(digit)}
                className="flex flex-col items-center justify-center rounded-xl bg-slate-800/50 py-2.5 hover:bg-slate-700/60 active:scale-95 transition disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base font-bold leading-none text-white">{digit}</span>
                {subtext && (
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider mt-0.5">
                    {subtext}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Call Controls */}
          {callState === "connected" ? (
            <div className="space-y-2 pt-1">
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition cursor-pointer ${
                    isMuted ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                  title="Speaker"
                >
                  <Volume2 size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleEndCall}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition cursor-pointer"
              >
                <PhoneOff size={15} />
                <span>End Call</span>
              </button>
            </div>
          ) : callState === "dialing" ? (
            <button
              type="button"
              onClick={handleEndCall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition cursor-pointer"
            >
              <PhoneOff size={15} />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!phoneNumber}
              onClick={handleStartCall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <PhoneCall size={15} />
              <span>Call</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
