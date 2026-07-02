"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import toast from "react-hot-toast";

export interface AttachmentItem {
  id: string;
  fileName: string;
  filePath: string;
  size: number;
}

interface AttachmentUploadProps {
  invoiceId?: string;
  quotationId?: string;
  existing?: AttachmentItem[];
  pendingFiles?: File[];
  onPendingChange?: (files: File[]) => void;
  onAttachmentsChange?: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUpload({
  invoiceId,
  quotationId,
  existing = [],
  pendingFiles = [],
  onPendingChange,
  onAttachmentsChange,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canUploadNow = !!(invoiceId || quotationId);

  const validateFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error(`${file.name} exceeds 10MB limit`);
      return false;
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      toast.error(`${file.name}: only PDF, JPG, PNG allowed`);
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    if (invoiceId) formData.append("invoiceId", invoiceId);
    if (quotationId) formData.append("quotationId", quotationId);
    await api.post("/attachments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const valid = list.filter(validateFile);
      if (valid.length === 0) return;

      if (!canUploadNow) {
        onPendingChange?.([...pendingFiles, ...valid]);
        return;
      }

      setUploading(true);
      try {
        for (const file of valid) {
          await uploadFile(file);
        }
        toast.success(valid.length > 1 ? "Files uploaded" : "File uploaded");
        onAttachmentsChange?.();
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [canUploadNow, invoiceId, quotationId, onAttachmentsChange, onPendingChange, pendingFiles]
  );

  const removePending = (index: number) => {
    onPendingChange?.(pendingFiles.filter((_, i) => i !== index));
  };

  const removeExisting = async (attachmentId: string) => {
    try {
      await api.delete(`/attachments?id=${attachmentId}`);
      toast.success("Attachment removed");
      onAttachmentsChange?.();
    } catch {
      toast.error("Failed to remove attachment");
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-indigo-500" />
        ) : (
          <Upload className="mb-3 h-10 w-10 text-slate-400" />
        )}
        <p className="text-sm font-medium text-slate-700">Drag and drop files here</p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
        {!canUploadNow && (
          <p className="mt-2 text-xs text-amber-600">Files will upload after you save the document</p>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-lg"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Browse Files
        </Button>
      </div>

      {(existing.length > 0 || pendingFiles.length > 0) && (
        <ul className="space-y-2">
          {existing.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <a
                href={a.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-indigo-600 hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{a.fileName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">({formatSize(a.size)})</span>
              </a>
              <button
                type="button"
                onClick={() => removeExisting(a.id)}
                className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {pendingFiles.map((file, i) => (
            <li
              key={`pending-${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">({formatSize(file.size)})</span>
                <span className="text-xs text-amber-600">pending</span>
              </span>
              <button
                type="button"
                onClick={() => removePending(i)}
                className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function uploadPendingAttachments(
  files: File[],
  opts: { invoiceId?: string; quotationId?: string }
) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    if (opts.invoiceId) formData.append("invoiceId", opts.invoiceId);
    if (opts.quotationId) formData.append("quotationId", opts.quotationId);
    await api.post("/attachments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}
