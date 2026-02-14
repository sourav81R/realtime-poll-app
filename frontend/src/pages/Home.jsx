import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10 sm:pb-16 text-center">
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Live Poll Toolkit
        </span>
        <h1 className="display-font mt-5 sm:mt-6 text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          Build polls people
          <br className="hidden sm:block" />
          <span className="brand-gradient-text">want to interact with.</span>
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl mx-auto text-base sm:text-xl text-slate-600 mb-8 sm:mb-10 px-1">
          Spin up a poll in seconds, share one link, and watch results animate
          live as your audience votes.
        </p>
        <div className="flex justify-center">
          <Link
            to="/create"
            className="btn-accent inline-flex items-center justify-center rounded-full w-full sm:w-auto px-8 py-3 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Create a Poll
          </Link>
        </div>
      </div>

      <div className="py-6 sm:py-8 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              tag="LIVE"
              title="Instant Updates"
              desc="Votes appear in real time without page refresh."
            />
            <FeatureCard
              tag="FAIR"
              title="Duplicate Protection"
              desc="Built-in guardrails help prevent repeated voting abuse."
            />
            <FeatureCard
              tag="FAST"
              title="Share and Launch"
              desc="Create, copy link, and start collecting opinions in seconds."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ tag, title, desc }) {
  return (
    <div className="glass-panel card-lift rounded-2xl sm:rounded-3xl p-5 sm:p-6">
      <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold tracking-wide text-teal-700">
        {tag}
      </span>
      <h3 className="display-font mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
