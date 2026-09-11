"use client";

import Link from "next/link";
import { useAppCopy } from "@/components/app-locale-provider";

interface HomeHeroProps {
  isAuthenticated: boolean;
}

const BEFORE_TEXT = "I think social media is important because people can easily communicate with their friends and also discover information…";
const AFTER_TEXT = "In my opinion, social media plays an important role in our daily lives, as it allows us to easily stay in touch with loved ones while facilitating access to information.";

const CHALLENGES = [
  ["Structure", "Organize your ideas clearly and coherently."],
  ["Grammar", "Identify the errors hindering your expression."],
  ["Vocabulary", "Find more precise and natural ways to express your ideas."],
  ["Coherence", "Learn to connect your ideas more effectively."],
] as const;

const STEPS = [
  ["Choose a TCF task", "Work with Task 1, 2, or 3 and a prompt suited to the written-expression exam."],
  ["Write your response", "Practise independently in a focused writing space."],
  ["Review your feedback", "Use specific observations to guide your next attempt."],
] as const;

const FAQS = [
  ["What is the TCF?", "The Test de connaissance du français (TCF) is a French-language assessment. MyTCFLab focuses on written-expression practice."],
  ["Which proficiency level is the app suitable for?", "It is designed for learners preparing to practise written French at different stages."],
  ["Which skills can I practise?", "Tasks 1, 2, and 3, with attention to structure, grammar, vocabulary, and coherence."],
  ["Is the app free?", "Access is currently managed in small groups. The access page will always show the terms available to you."],
  ["When will I get access?", "Access is being opened gradually. Create an account to begin the current access journey."],
  ["Do I need to create an account to join the list?", "You need an account to access the learning workspace. The current sign-up flow will guide you through the available steps."],
  ["Does the app replace a French course?", "No. It is a practice and supplementary-preparation tool that helps you identify difficulties and practise more deliberately."],
] as const;

// Auth stays resolved by the server page; this client component supplies the
// locale-aware hero CTA and the product story around it.
export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const copy = useAppCopy();
  const ctaHref = isAuthenticated ? "/tasks" : "/signup";
  const ctaLabel = isAuthenticated ? copy.home.startATask : copy.home.getStarted;

  return (
    <main className="bg-[#080808] text-[#f5f5f5]">
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">TCF writing practice</p>
        <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl">
          {copy.home.title}
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-400">{copy.home.description}</p>
        <Link href={ctaHref} className="mt-9 inline-flex items-center rounded-full bg-white px-7 py-3 text-base font-semibold text-zinc-950 transition-transform transition-colors hover:scale-[1.02] hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          {ctaLabel}<span className="ml-2" aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="border-y border-white/[.1] bg-white/[.035] px-6 py-20 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">From a first draft to a clearer response</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div><h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">See what more precise expression can look like.</h2><p className="mt-4 max-w-md leading-7 text-zinc-400">Feedback is designed to help you understand the changes—not just see a corrected answer.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><ResponseCard label="Before" text={BEFORE_TEXT} tone="muted" /><ResponseCard label="After" text={AFTER_TEXT} tone="accent" /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">Why writing for the TCF feels different</p>
        <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Writing in French is difficult. Writing for the TCF is even harder.</h2>
        <p className="mt-5 max-w-2xl leading-7 text-zinc-400">You may know a lot of French and still lose clarity when your response is not sufficiently structured for the task.</p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[.1] bg-white/[.1] sm:grid-cols-2">{CHALLENGES.map(([title, description]) => <InfoCard key={title} title={title} description={description} />)}</div>
      </section>

      <section className="bg-violet-300 px-6 py-20 text-zinc-950 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold tracking-[0.18em] uppercase">How it works</p><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">A practical loop for every response.</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">{STEPS.map(([title, description], index) => <li key={title} className="border-t border-zinc-950/20 pt-5"><p className="font-mono text-sm">0{index + 1}</p><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-zinc-800">{description}</p></li>)}</ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:items-center lg:py-28">
        <div><p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">Feedback methodology</p><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">A correction should show you what to work on next.</h2><p className="mt-5 leading-7 text-zinc-400">MyTCFLab looks beyond isolated mistakes so each response becomes useful practice for the requirements of TCF written expression.</p></div>
        <ul className="overflow-hidden rounded-2xl border border-white/[.1] bg-white/[.035]">{["What is already working", "What makes the response harder to understand", "What to revise first", "How to make the next response more deliberate"].map((item, index) => <li key={item} className="flex gap-4 border-b border-white/[.1] px-5 py-4 last:border-b-0"><span className="font-mono text-sm text-violet-300">0{index + 1}</span><span>{item}</span></li>)}</ul>
      </section>

      <section className="border-y border-white/[.1] bg-white/[.035] px-6 py-20 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">What will you be working on?</p><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">The elements that shape a strong written response.</h2><ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["Task response and register", "Organisation and coherence", "Grammar and sentence control", "Vocabulary precision", "Clarity and overall expression"].map((item) => <li key={item} className="rounded-xl border border-white/[.1] bg-zinc-950 px-4 py-4 text-zinc-200">{item}</li>)}</ul></div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10 lg:py-28">
        <p className="text-center text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">Questions</p><h2 className="mt-5 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-12 divide-y divide-white/[.1] border-y border-white/[.1]">{FAQS.map(([question, answer]) => <FAQItem key={question} question={question} answer={answer} />)}</div>
      </section>

      <footer className="border-t border-white/[.1] px-6 py-10 sm:px-10"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-white">MyTCFLab</span><span>Focused practice for TCF written expression.</span></div></footer>
    </main>
  );
}

function ResponseCard({ label, text, tone }: { label: string; text: string; tone: "muted" | "accent" }) {
  const className = tone === "accent" ? "rounded-2xl border border-violet-300/50 bg-violet-300/[.12] p-6" : "rounded-2xl border border-white/[.1] bg-zinc-950 p-6";
  return <article className={className}><p className="text-sm font-semibold text-violet-200">{label}</p><p className="mt-5 leading-7 text-zinc-200">{text}</p></article>;
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return <article className="bg-[#080808] p-6 sm:p-8"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 max-w-sm leading-7 text-zinc-400">{description}</p></article>;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return <details className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">{question}<span className="text-xl text-violet-300 transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pt-3 leading-7 text-zinc-400">{answer}</p></details>;
}
