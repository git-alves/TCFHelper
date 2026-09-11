"use client";

import Link from "next/link";
import { useAppLocale } from "@/components/app-locale-provider";
import { DashboardPreview } from "@/components/dashboard-preview";
import { EditorDemo } from "@/components/editor-demo";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";
import { useReveal } from "@/lib/use-reveal";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 17v-5.5h1.8l.3-2.3h-2.1V7.8c0-.7.2-1.1 1.2-1.1h1V4.6c-.2 0-.9-.1-1.7-.1-1.7 0-2.9 1-2.9 2.9v1.8H7.5v2.3h1.6V17" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Placeholder hrefs ("#") -- the real Facebook/Instagram URLs will be filled
// in once the accounts exist.
const SOCIAL_LINKS = [
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "Instagram", href: "#", Icon: InstagramIcon },
];

interface HomeHeroProps {
  isAuthenticated: boolean;
}

// Fades/slides a section in the first time it scrolls into view, so the
// page reads as a living product tour rather than a static document. Skips
// straight to visible for anyone who never gets a qualifying
// IntersectionObserver entry (reduced motion, SSR, older browsers) -- see
// useReveal. print: always wins regardless of `visible`: a browser's
// print/"Save as PDF" layout renders the whole page at once rather than
// scrolling it, so nothing here would ever intersect and every section
// below the hero would print blank without this override.
function revealClassName(visible: boolean) {
  return `transition-all duration-700 ease-out print:opacity-100 print:translate-y-0 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;
}

export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const { locale } = useAppLocale();
  const copy = LANDING_PAGE_COPY[locale];
  const destination = isAuthenticated ? "/tasks" : "/signup";

  const { ref: proofRef, visible: proofVisible } = useReveal<HTMLElement>();
  const { ref: whyRef, visible: whyVisible } = useReveal<HTMLElement>();
  const { ref: stepsRef, visible: stepsVisible } = useReveal<HTMLElement>();
  const { ref: methodRef, visible: methodVisible } = useReveal<HTMLElement>();
  const { ref: assessedRef, visible: assessedVisible } = useReveal<HTMLElement>();
  const { ref: closingRef, visible: closingVisible } = useReveal<HTMLElement>();

  return (
    <main className="bg-[#080808] text-[#f5f5f5]">
      <section className="mx-auto flex min-h-[calc(100svh-65px)] max-w-4xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10 lg:px-12 xl:px-16">
        <p className="text-sm font-medium text-violet-300">{copy.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-6xl">{copy.title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">{copy.description}</p>
        <Link href={destination} className="mt-8 rounded-full bg-[#f5f5f5] px-7 py-3 text-base font-medium text-[#111] transition-transform transition-colors hover:scale-[1.02] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy.primaryAction}</Link>
        <EditorDemo taskLabel={copy.demoTaskLabel} taskPrompt={copy.demoTaskPrompt} />
      </section>

      <section
        ref={proofRef}
        className={`border-y border-white/[.12] bg-white/[.035] px-6 py-20 sm:px-10 lg:px-12 xl:px-16 ${revealClassName(proofVisible)}`}
        aria-labelledby="problem-heading"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-violet-300">{copy.problemEyebrow}</p>
          <h2 id="problem-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.problemTitle}</h2>
          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">{copy.problemDescription}</p>
          <p className="mt-10 text-sm font-medium text-violet-300">{copy.proofEyebrow}</p><h3 id="proof-heading" className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">{copy.proofTitle}</h3>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/[.12] bg-black/20 p-6">
              <p className="text-sm font-medium text-zinc-400">{copy.before}</p>
              <p className="mt-5 text-lg leading-8 text-zinc-300">{copy.beforeText}</p>
              <dl className="mt-6 space-y-2 border-t border-white/[.1] pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{copy.beforeAnalysisLabel}</p>
                {copy.beforeAnalysis.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-zinc-500">{item.label}</dt>
                    <dd className="font-medium text-zinc-300">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
            <article className="rounded-2xl border border-violet-300/35 bg-violet-400/[.08] p-6">
              <p className="text-sm font-medium text-violet-200">{copy.after}</p>
              <p className="mt-5 text-lg leading-8 text-white">{copy.afterText}</p>
              <dl className="mt-6 space-y-2 border-t border-violet-300/25 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{copy.afterAnalysisLabel}</p>
                {copy.afterAnalysis.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-violet-200/80">{item.label}</dt>
                    <dd className="font-medium text-white">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
        </div>
      </section>

      <section
        ref={whyRef}
        className={`mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12 xl:px-16 ${revealClassName(whyVisible)}`}
        aria-labelledby="why-heading"
      >
        <p className="text-sm font-medium text-violet-300">{copy.whyEyebrow}</p><h2 id="why-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.whyTitle}</h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{copy.whyItems.map((item) => <li key={item} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{item}</li>)}</ul>
      </section>

      <section
        ref={stepsRef}
        className={`bg-white/[.035] px-6 py-20 sm:px-10 lg:px-12 xl:px-16 ${revealClassName(stepsVisible)}`}
        aria-labelledby="steps-heading"
      >
        <div className="mx-auto max-w-7xl"><p className="text-sm font-medium text-violet-300">{copy.stepsEyebrow}</p><h2 id="steps-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.stepsTitle}</h2><ol className="mt-10 grid gap-4 md:grid-cols-3">{copy.steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-white/[.12] p-6"><span className="text-sm font-semibold text-violet-200">0{index + 1}</span><h3 className="mt-5 text-lg font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p></li>)}</ol><DashboardPreview /></div>
      </section>

      <section
        ref={methodRef}
        className={`mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 lg:px-12 xl:px-16 md:grid-cols-2 ${revealClassName(methodVisible)}`}
        aria-labelledby="method-heading"
      >
        <div><p className="text-sm font-medium text-violet-300">{copy.methodEyebrow}</p><h2 id="method-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.methodTitle}</h2><p className="mt-5 leading-7 text-zinc-400">{copy.methodDescription}</p></div><ul className="space-y-3 self-center">{copy.methodPoints.map((point) => <li key={point} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{point}</li>)}</ul>
      </section>

      <section
        ref={assessedRef}
        className={`border-y border-white/[.12] bg-white/[.035] px-6 py-20 sm:px-10 lg:px-12 xl:px-16 ${revealClassName(assessedVisible)}`}
        aria-labelledby="assessed-heading"
      >
        <div className="mx-auto max-w-7xl"><p className="text-sm font-medium text-violet-300">{copy.assessedEyebrow}</p><h2 id="assessed-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.assessedTitle}</h2><ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{copy.assessed.map((item) => <li key={item} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{item}</li>)}</ul></div>
      </section>

      <section
        ref={closingRef}
        className={`mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 lg:px-12 xl:px-16 ${revealClassName(closingVisible)}`}
        aria-labelledby="closing-heading"
      >
        <h2 id="closing-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.closingTitle}</h2>
        <Link href={destination} className="mt-8 inline-block rounded-full bg-[#f5f5f5] px-7 py-3 text-base font-medium text-[#111] transition-transform transition-colors hover:scale-[1.02] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy.primaryAction}</Link>
      </section>

      <footer className="border-t border-white/[.12] px-6 py-8 text-center text-sm text-zinc-500">
        <div className="flex items-center justify-center gap-4">
          {SOCIAL_LINKS.map(({ label, href, Icon }) => (
            <a key={label} href={href} aria-label={label} className="text-zinc-500 transition-colors hover:text-zinc-300">
              <Icon />
            </a>
          ))}
        </div>
        <p className="mt-4">{copy.footer}</p>
      </footer>
    </main>
  );
}
