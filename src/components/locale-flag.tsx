import type { ReactElement } from "react";
import type { AppLocale } from "@/lib/app-locale";

// Simplified flag glyphs, not full heraldic detail: at picker size (20x14)
// the coat of arms on the Spanish and Brazilian flags is illegible anyway,
// so each keeps only the field/bands that make it recognizable.
function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 20 14" className="h-full w-full" aria-hidden="true">
      <rect width="20" height="14" fill="#00247D" />
      <path d="M0 0 20 14M20 0 0 14" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 20 14M20 0 0 14" stroke="#CF142B" strokeWidth="1.2" />
      <path d="M10 0V14M0 7H20" stroke="#fff" strokeWidth="4.6" />
      <path d="M10 0V14M0 7H20" stroke="#CF142B" strokeWidth="2.4" />
    </svg>
  );
}

function FranceFlag() {
  return (
    <svg viewBox="0 0 20 14" className="h-full w-full" aria-hidden="true">
      <rect width="20" height="14" fill="#fff" />
      <rect width="6.67" height="14" fill="#0055A4" />
      <rect x="13.33" width="6.67" height="14" fill="#EF4135" />
    </svg>
  );
}

function SpainFlag() {
  return (
    <svg viewBox="0 0 20 14" className="h-full w-full" aria-hidden="true">
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  );
}

function BrazilFlag() {
  return (
    <svg viewBox="0 0 20 14" className="h-full w-full" aria-hidden="true">
      <rect width="20" height="14" fill="#009739" />
      <polygon points="10,2 18,7 10,12 2,7" fill="#FEDD00" />
      <circle cx="10" cy="7" r="3.2" fill="#002776" />
    </svg>
  );
}

const LOCALE_FLAGS: Record<AppLocale, () => ReactElement> = {
  en: UnitedKingdomFlag,
  fr: FranceFlag,
  es: SpainFlag,
  pt: BrazilFlag,
};

export function LocaleFlag({ locale, className = "h-3.5 w-5 shrink-0 rounded-[2px]" }: { locale: AppLocale; className?: string }) {
  const Flag = LOCALE_FLAGS[locale];
  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      <Flag />
    </span>
  );
}
