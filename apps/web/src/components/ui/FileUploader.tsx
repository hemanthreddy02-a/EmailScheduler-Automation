import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface FileUploaderProps {
  onParsedRecipients: (valid: string[], invalid: string[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onParsedRecipients,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validCount, setValidCount] = useState<number | null>(null);
  const [invalidCount, setInvalidCount] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setError("Please upload a .csv or .txt file");
      return;
    }

    setError(null);
    setFileName(file.name);

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        complete: (results) => {
          const rawEmails: string[] = [];
          for (const row of results.data as string[][]) {
            for (const cell of row) {
              if (cell && typeof cell === "string") {
                // Split by spaces or commas if multiple in a cell
                const matches = cell.match(/[^\s,;]+/g);
                if (matches) rawEmails.push(...matches);
              }
            }
          }
          categorizeEmails(rawEmails);
        },
        error: () => setError("Failed to parse CSV file"),
      });
    } else {
      // .txt file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const matches = text ? text.match(/[^\s,;]+/g) || [] : [];
        categorizeEmails(matches);
      };
      reader.readAsText(file);
    }
  };

  const categorizeEmails = (rawEmails: string[]) => {
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const raw of rawEmails) {
      const clean = raw.trim().toLowerCase();
      if (!clean) continue;

      if (emailRegex.test(clean)) {
        if (!seen.has(clean)) {
          seen.add(clean);
          valid.push(clean);
        }
      } else {
        invalid.push(raw);
      }
    }

    setValidCount(valid.length);
    setInvalidCount(invalid.length);
    onParsedRecipients(valid, invalid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Recipients (CSV or TXT)
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-brand-500 bg-brand-50/50"
            : fileName
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) processFile(e.target.files[0]);
          }}
        />

        {fileName ? (
          <div className="flex flex-col items-center justify-center gap-1">
            <FileText className="w-6 h-6 text-brand-600" />
            <p className="text-xs font-semibold text-gray-800">{fileName}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid detected
              </span>
              {invalidCount !== null && invalidCount > 0 && (
                <span className="flex items-center gap-1 text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} invalid
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">Click or drag to replace file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <UploadCloud className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-700">
                Drop CSV/TXT file here, or <span className="text-brand-600 underline">browse</span>
              </p>
              <p className="text-[11px] text-gray-400">
                Automatically parses & deduplicates emails
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
};
