"use client";

import Link from "next/link";
import { useAppLocale } from "@/components/app-locale-provider";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";

interface HomeHeroProps {
  isAuthenticated: boolean;
}

export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const { locale } = useAppLocale();
  const copy = LANDING_PAGE_COPY[locale];
  const destination = isAuthenticated ? "/tasks" : "/signup";

  return (
    <main className="bg-[#080808] text-[#f5f5f5]">
      <section className="mx-auto flex min-h-[calc(100svh-65px)] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
        <p className="text-sm font-medium text-violet-300">{copy.eyebrow}</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-6xl">{copy.title}</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">{copy.description}</p>
        <Link href={destination} className="mt-8 rounded-full bg-[#f5f5f5] px-7 py-3 text-base font-medium text-[#111] transition-transform transition-colors hover:scale-[1.02] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy.primaryAction}</Link>
      </section>

      <section className="border-y border-white/[.12] bg-white/[.035] px-6 py-20 sm:px-10" aria-labelledby="proof-heading">
        <div className="mx-auto max-w-5xl"><p className="text-sm font-medium text-violet-300">{copy.proofEyebrow}</p><h2 id="proof-heading" className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.proofTitle}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
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

      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10" aria-labelledby="problem-heading">
        <p className="text-sm font-medium text-violet-300">{copy.problemEyebrow}</p><h2 id="problem-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.problemTitle}</h2><p className="mt-5 max-w-2xl leading-7 text-zinc-400">{copy.problemDescription}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{copy.skills.map((skill) => <article key={skill.title} className="rounded-2xl border border-white/[.12] p-5"><h3 className="font-semibold">{skill.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{skill.description}</p></article>)}</div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10" aria-labelledby="why-heading">
        <p className="text-sm font-medium text-violet-300">{copy.whyEyebrow}</p><h2 id="why-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.whyTitle}</h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{copy.whyItems.map((item) => <li key={item} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{item}</li>)}</ul>
      </section>

      <section className="bg-white/[.035] px-6 py-20 sm:px-10" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-5xl"><p className="text-sm font-medium text-violet-300">{copy.stepsEyebrow}</p><h2 id="steps-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.stepsTitle}</h2><ol className="mt-10 grid gap-4 md:grid-cols-3">{copy.steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-white/[.12] p-6"><span className="text-sm font-semibold text-violet-200">0{index + 1}</span><h3 className="mt-5 text-lg font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p></li>)}</ol></div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-20 sm:px-10 md:grid-cols-2" aria-labelledby="method-heading">
        <div><p className="text-sm font-medium text-violet-300">{copy.methodEyebrow}</p><h2 id="method-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.methodTitle}</h2><p className="mt-5 leading-7 text-zinc-400">{copy.methodDescription}</p></div><ul className="space-y-3 self-center">{copy.methodPoints.map((point) => <li key={point} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{point}</li>)}</ul>
      </section>

      <section className="border-y border-white/[.12] bg-white/[.035] px-6 py-20 sm:px-10" aria-labelledby="assessed-heading">
        <div className="mx-auto max-w-5xl"><p className="text-sm font-medium text-violet-300">{copy.assessedEyebrow}</p><h2 id="assessed-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.assessedTitle}</h2><ul className="mt-10 grid gap-3 sm:grid-cols-2">{copy.assessed.map((item) => <li key={item} className="rounded-xl border border-white/[.12] px-5 py-4 text-zinc-200">{item}</li>)}</ul></div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10" aria-labelledby="faq-heading">
        <p className="text-sm font-medium text-violet-300">{copy.faqEyebrow}</p><h2 id="faq-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.faqTitle}</h2><div className="mt-10 divide-y divide-white/[.12]">{copy.faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none font-medium text-white marker:hidden">{faq.question}<span className="float-right text-violet-200 transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 max-w-2xl leading-7 text-zinc-400">{faq.answer}</p></details>)}</div>
      </section>

      <footer className="border-t border-white/[.12] px-6 py-8 text-center text-sm text-zinc-500">{copy.footer}</footer>
    </main>
  );
}
