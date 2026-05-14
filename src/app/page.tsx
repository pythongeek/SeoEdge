"use client";

import Link from "next/link";
import {
  Zap,
  BarChart3,
  Shield,
  TrendingUp,
  Cpu,
  Globe,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: BarChart3,
      title: "CTR Lab",
      desc: "Identify underperforming queries and benchmark against position-based CTR models",
    },
    {
      icon: Cpu,
      title: "AI Overview & GEO",
      desc: "Detect AI Overview risks and optimize for Generative Engine Optimization",
    },
    {
      icon: TrendingUp,
      title: "Trend Intelligence",
      desc: "Track rising and falling queries with AI-powered trend detection",
    },
    {
      icon: Globe,
      title: "Topic Clusters",
      desc: "Visualize keyword clusters and identify content coverage gaps",
    },
    {
      icon: Shield,
      title: "Core Web Vitals",
      desc: "Monitor LCP, INP, CLS and get actionable fix recommendations",
    },
    {
      icon: Zap,
      title: "AI-Powered Insights",
      desc: "Get structured AI analysis with actionable SEO recommendations",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">
              SEO<span className="text-blue-500">Master</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" />
            AI-Powered SEO Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Master your search
            <br />
            <span className="text-gradient">performance</span>
          </h1>
          <p className="text-lg text-gray-400 mt-6 max-w-2xl mx-auto">
            Enterprise-grade SEO analytics with AI intelligence, Google Search Console
            integration, and actionable insights that drive real results.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="border border-gray-700 hover:border-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            Everything you need to dominate search
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "For individuals getting started",
                features: ["1 workspace", "1,000 GSC rows", "Basic CTR analysis", "No AI features"],
                cta: "Get started",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$49",
                desc: "For serious SEO professionals",
                features: [
                  "3 workspaces",
                  "25,000 GSC rows",
                  "AI analysis & GEO",
                  "SERP intelligence",
                  "Scheduled reports",
                  "API access",
                ],
                cta: "Start free trial",
                highlight: true,
              },
              {
                name: "Business",
                price: "$149",
                desc: "For agencies and teams",
                features: [
                  "10 workspaces",
                  "100,000 GSC rows",
                  "Everything in Pro",
                  "Team collaboration",
                  "Custom branding",
                  "Priority support",
                ],
                cta: "Contact sales",
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl p-6 ${
                  plan.highlight
                    ? "bg-blue-600/10 border-2 border-blue-600/50"
                    : "bg-gray-900/50 border border-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>
                <p className="text-3xl font-bold text-white mt-4">
                  {plan.price}
                  <span className="text-sm text-gray-500 font-normal">/mo</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-colors inline-block text-center ${
                    plan.highlight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-400">
              SEOMaster
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Built for modern SEO professionals
          </p>
        </div>
      </footer>
    </div>
  );
}
