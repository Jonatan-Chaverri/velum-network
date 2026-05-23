"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";

const nodes = [
  { name: "Research Agent", x: "12%", y: "18%" },
  { name: "Compute API", x: "74%", y: "20%" },
  { name: "Workflow Tool", x: "26%", y: "68%" },
  { name: "Data Service", x: "78%", y: "72%" },
];

export function HeroVisual() {
  return (
    <div className="surface relative overflow-hidden rounded-[2rem] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_26%)]" />
      <div className="absolute inset-0 bg-hero-grid bg-[size:42px_42px] opacity-20" />

      <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70">
        <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-300/50 to-transparent animate-pulse-line" />
        <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-fuchsia-300/40 to-transparent animate-pulse-line" />

        <motion.div
          initial={{ opacity: 0.5, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="surface relative z-10 w-full max-w-md rounded-[1.75rem] p-6"
        >
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-400/10 text-emerald-200">
              Marketplace purchase live
            </Badge>
            <span className="text-xs text-slate-500">Private by default</span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Agent order
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">Compute API</div>
              <div className="mt-2 text-sm text-slate-400">
                Purchased automatically with merchant rules, budgets, and confidential settlement applied
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm text-slate-400">Listings discovered</div>
                <div className="mt-2 text-xl font-semibold text-white">142</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm text-slate-400">Purchases completed</div>
                <div className="mt-2 text-xl font-semibold text-white">18.4k</div>
              </div>
            </div>
          </div>
        </motion.div>

        {nodes.map((node, index) => (
          <motion.div
            key={node.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * index, duration: 0.9 }}
            className="absolute"
            style={{ left: node.x, top: node.y }}
          >
            <div className="animate-float rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white shadow-glow">
              {node.name}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
