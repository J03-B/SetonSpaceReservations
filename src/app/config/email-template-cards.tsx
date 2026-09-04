"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EmailTemplateCard } from "@/lib/email/messages";
import { cn } from "@/lib/utils";

type PreviewMode = "example" | "raw";

export function EmailTemplateCards({
  templates,
}: {
  templates: EmailTemplateCard[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<PreviewMode>("example");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const modeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const open = templates.find((template) => template.id === openId) ?? null;
  const showingRaw = mode === "raw";
  const previewHtml = open
    ? showingRaw
      ? open.rawHtml
      : open.html
    : "";
  const previewSubject = open
    ? showingRaw
      ? open.rawSubject
      : open.subject
    : "";
  const previewCopy = open
    ? showingRaw
      ? open.rawCopyValue
      : open.copyValue
    : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMode("example");
    setCopiedId(null);
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    const focusId = window.requestAnimationFrame(() => {
      modeButtonRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusId);
      openerRef.current?.focus();
    };
  }, [openId]);

  async function copyHtml(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={openId === template.id}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setMode("example");
                setOpenId(template.id);
              }}
              className="flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-3 py-4 text-center text-sm font-medium text-text-primary hover:bg-surface-subtle"
            >
              {template.label}
            </button>
          </li>
        ))}
      </ul>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label={`Close ${open.label} preview`}
                onClick={() => setOpenId(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex h-[min(52rem,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    role="radiogroup"
                    aria-label="Preview content"
                    className="flex min-w-0 flex-wrap gap-2"
                  >
                    <button
                      ref={mode === "example" ? modeButtonRef : undefined}
                      type="button"
                      role="radio"
                      aria-checked={mode === "example"}
                      onClick={() => setMode("example")}
                      className={cn(
                        "min-h-11 rounded-md px-3 text-sm font-medium",
                        mode === "example"
                          ? "bg-action-primary text-text-inverse"
                          : "border border-border text-text-primary hover:bg-surface-subtle",
                      )}
                    >
                      Show example information
                    </button>
                    <button
                      ref={mode === "raw" ? modeButtonRef : undefined}
                      type="button"
                      role="radio"
                      aria-checked={mode === "raw"}
                      onClick={() => setMode("raw")}
                      className={cn(
                        "min-h-11 rounded-md px-3 text-sm font-medium",
                        mode === "raw"
                          ? "bg-action-primary text-text-inverse"
                          : "border border-border text-text-primary hover:bg-surface-subtle",
                      )}
                    >
                      Show raw
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    className="min-h-11 min-w-11 shrink-0 rounded-md px-3 text-sm text-text-secondary hover:bg-surface-subtle"
                    aria-label={`Close ${open.label} preview`}
                  >
                    Close
                  </button>
                </div>
                <h2 id={titleId} className="mt-3 text-center text-lg font-semibold">
                  {open.label}
                </h2>
                <p className="mt-1 text-center text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  {open.via}
                </p>
                <p className="mt-1 text-center text-sm text-text-primary">
                  {previewSubject}
                </p>
                {open.via === "Supabase" ? (
                  <p className="mt-2 text-center text-xs text-text-secondary">
                    Copy includes the {`{{ .Token }}`} placeholder for the code.
                  </p>
                ) : null}
                <iframe
                  key={`${open.id}-${mode}`}
                  title={`${open.label} preview`}
                  srcDoc={previewHtml}
                  sandbox=""
                  referrerPolicy="no-referrer"
                  className="mt-4 min-h-0 w-full flex-1 rounded-md border border-border bg-white"
                />
                <button
                  type="button"
                  onClick={() => void copyHtml(open.id, previewCopy)}
                  className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover"
                >
                  {copiedId === open.id ? "Copied" : open.copyLabel}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
