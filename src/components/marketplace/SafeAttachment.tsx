import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const IMAGE_EXT_RE = /\.(avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const PDF_EXT_RE = /\.pdf(?:$|[?#])/i;

function isPreviewableImage(url: string) {
  return IMAGE_EXT_RE.test(url);
}

function isPdf(url: string) {
  return PDF_EXT_RE.test(url);
}

export function SafeImagePreview({
  url,
  alt,
  className,
  imageClassName,
}: {
  url: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed || !isPreviewableImage(url)) {
    return <FileAttachment url={url} label={alt} />;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("block max-w-full text-left", className)}>
        <img
          src={url}
          alt={alt}
          className={cn("max-w-full object-cover", imageClassName)}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </button>
      {open && <AttachmentLightbox url={url} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReceiptPreview({
  url,
  title = "Чек",
  subtitle,
  className,
  compact = false,
}: {
  url: string;
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canPreview = isPreviewableImage(url) && !failed;

  const download = async () => {
    setDownloading(true);
    try {
      await downloadUrl(url, title);
    } catch {
      toast.error("Не удалось скачать чек");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn("min-w-0 rounded-xl border border-border bg-background/70 p-2", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {canPreview ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted"
            aria-label="Открыть чек"
          >
            <img src={url} alt={title} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
          </button>
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {canPreview && (
              <button type="button" onClick={() => setOpen(true)} className="text-primary underline underline-offset-2">
                Открыть
              </button>
            )}
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 disabled:opacity-60"
            >
              <Download className="h-3 w-3" /> {downloading ? "Скачиваем…" : isPdf(url) ? "Скачать PDF" : compact ? "Скачать" : "Скачать файл"}
            </button>
          </div>
        </div>
      </div>
      {open && canPreview && <AttachmentLightbox url={url} alt={title} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FileAttachment({ url, label }: { url: string; label: string }) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      await downloadUrl(url, label);
    } catch {
      toast.error("Не удалось скачать файл");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className="flex max-w-full items-center gap-2 rounded-xl bg-background/70 p-2 text-xs text-foreground underline underline-offset-2"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{downloading ? "Скачиваем…" : label}</span>
    </button>
  );
}

async function downloadUrl(url: string, label: string) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error("download failed");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const filename = getFilename(url, label, blob.type);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

function getFilename(url: string, label: string, mime: string) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
    if (last.includes(".")) return last;
  } catch {
    // ignore
  }
  const ext = mime.includes("pdf") ? "pdf" : mime.includes("png") ? "png" : "jpg";
  return `${label || "receipt"}.${ext}`.replace(/[/\\?%*:|"<>]/g, "-");
}

function AttachmentLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background/95 p-3 backdrop-blur" role="dialog" aria-modal="true">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="min-w-0 truncate text-sm font-medium">{alt}</div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted" aria-label="Закрыть">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-muted/50">
        <img src={url} alt={alt} className="mx-auto h-full max-h-full w-full max-w-full object-contain" />
      </div>
    </div>
  );
}