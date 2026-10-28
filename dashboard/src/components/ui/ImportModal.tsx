import { useState, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  onDownloadTemplate: (format: "xlsx" | "csv") => void;
}

export default function ImportModal({
  isOpen,
  onClose,
  onFileSelect,
  onDownloadTemplate,
}: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setError("Please select a valid CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  }

  function handleContinue() {
    if (!selectedFile) {
      setError("Please choose or drop a file before continuing.");
      return;
    }
    onFileSelect(selectedFile);
  }

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import Leads"
        className="dialog-enter flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Import Leads</h2>
              <p className="text-xs text-slate-500">
                Download a template or upload your spreadsheet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Template Prompt */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Download size={14} className="text-[#1d61e7]" />
                  Need the Import Template?
                </h3>
                <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                  Use our standardized template to format your data with the right columns
                  (Lead Name, Company, Email, Phone, Source, Status, Priority).
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onDownloadTemplate("xlsx")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Download Excel Template (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadTemplate("csv")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <FileText size={13} className="text-slate-600" />
                <span>Download CSV Template (.csv)</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload File Area */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Upload Your Completed File
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
                dragOver
                  ? "border-blue-500 bg-blue-50/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7] mb-2">
                    <Upload size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports .xlsx, .xls, and .csv (Max 5MB)
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Supported Columns Reference */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Columns in Template (matches Leads table)
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-800">
                Lead Name *
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Company
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Email
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Phone
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Lead Source
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Status
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Priority
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Owner
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Next Follow-up
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                Notes
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedFile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            Continue to Preview
          </button>
        </div>
      </div>
    </div>
  );
}
