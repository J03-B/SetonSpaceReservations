"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const CREDIT_LINE_ONE = "Developed by Joe Benin.";
const CREDIT_LINE_TWO = "Support is appreciated!";
const HIDE_DELAY_MS = 700;
const DONATE_URL = "https://donate.stripe.com/00w4gydoD7KQcXD8js9ws00";
const DONATE_WINDOW = "joe-benin-donate";

type ApplePayWindow = Window & {
  ApplePaySession?: { canMakePayments: () => boolean };
};

function isIPhone(): boolean {
  return /iPhone/i.test(navigator.userAgent);
}

function canUseApplePay(): boolean {
  try {
    return Boolean(
      (window as ApplePayWindow).ApplePaySession?.canMakePayments(),
    );
  } catch {
    return false;
  }
}

function shouldOpenApplePayFullPage(): boolean {
  return isIPhone() && canUseApplePay();
}

function openDonatePopup(anchor: HTMLElement) {
  const width = 500;
  const height = Math.min(window.screen.availHeight - 24, 1000);
  const rect = anchor.getBoundingClientRect();
  const screenLeft = window.screenLeft ?? window.screenX;
  const screenTop = window.screenTop ?? window.screenY;
  const preferredLeft = screenLeft + rect.left - width - 16;
  const preferredTop =
    screenTop + (window.outerHeight - window.innerHeight) + rect.top;
  const maxLeft =
    screenLeft + (window.screen.availWidth ?? window.innerWidth) - width - 8;
  const maxTop =
    screenTop + (window.screen.availHeight ?? window.innerHeight) - height - 8;
  const left = Math.round(
    Math.min(Math.max(preferredLeft, screenLeft + 8), maxLeft),
  );
  const top = Math.round(Math.min(Math.max(preferredTop, screenTop + 8), maxTop));

  const popup = window.open(
    DONATE_URL,
    DONATE_WINDOW,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  );
  if (popup) {
    popup.opener = null;
  }
  return popup;
}

function DonateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-6 w-6 sm:h-7 sm:w-7 text-current"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 18V6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DeveloperWatermark() {
  const creditId = useId();
  const hideTimerRef = useRef<number | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);

  const showCredit = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setCreditOpen(true);
  }, []);

  const scheduleHideCredit = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setCreditOpen(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const openDonateFromLink = useCallback(
    (event: { currentTarget: HTMLElement; preventDefault: () => void }) => {
      if (shouldOpenApplePayFullPage()) {
        return;
      }
      event.preventDefault();
      openDonatePopup(event.currentTarget);
    },
    [],
  );

  return (
    <div className="developer-watermark pointer-events-none fixed right-3 bottom-3 z-[200] sm:right-4 sm:bottom-4">
      <div
        className={`group/watermark pointer-events-auto relative ${
          creditOpen ? "watermark-credit-open" : ""
        }`}
        onMouseEnter={showCredit}
        onMouseLeave={scheduleHideCredit}
      >
        <div
          aria-hidden
          className="absolute -top-14 -right-10 -bottom-14 -left-40"
        />

        <div className="absolute top-1/2 right-full -translate-y-1/2 pr-3">
          <div
            className={`w-max transition duration-300 ease-out motion-reduce:transition-none ${
              creditOpen
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none translate-x-2 opacity-0"
            }`}
          >
            <div className="flex w-max items-center gap-5 rounded-xl border border-border bg-surface p-4 shadow-lg sm:gap-6 sm:p-5">
              <p
                id={creditId}
                role="tooltip"
                className="text-left text-[13px] leading-tight font-medium text-text-primary sm:text-sm"
              >
                <span className="block whitespace-nowrap">{CREDIT_LINE_ONE}</span>
                <span className="block whitespace-nowrap">{CREDIT_LINE_TWO}</span>
              </p>
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Donate to Joe Benin with Apple Pay or card"
                className="watermark-coffee-pulse inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text-inverse no-underline sm:h-14 sm:w-14"
                onClick={openDonateFromLink}
              >
                <DonateIcon />
              </a>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-describedby={creditOpen ? creditId : undefined}
          aria-label="Developer credit"
          className={`origin-bottom-right rounded-md transition duration-300 ease-out motion-reduce:transition-none ${
            creditOpen
              ? "scale-110 opacity-100"
              : "scale-100 opacity-80"
          }`}
          onFocus={showCredit}
          onBlur={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.parentElement?.contains(event.relatedTarget)
            ) {
              return;
            }
            scheduleHideCredit();
          }}
        >
          <Image
            src="/map/Watermark.png"
            alt=""
            width={112}
            height={112}
            className="h-[5.6rem] w-[5.6rem] sm:h-28 sm:w-28"
          />
        </button>
      </div>
    </div>
  );
}
