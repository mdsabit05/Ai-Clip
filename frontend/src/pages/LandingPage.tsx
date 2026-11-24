import { useNavigate } from 'react-router-dom'
import { Zap, Video, Scissors, Download, Star, ArrowRight, CheckCircle2 } from 'lucide-react'

const features = [
  {
    icon: Video,
    title: 'AI Video Analysis',
    desc: 'Deep analysis of dialogue, scenes, emotions, and reaction moments to find the gold.',
  },
  {
    icon: Star,
    title: 'Viral Moment Scoring',
    desc: 'Every candidate clip is scored 0–100 on hook strength, entertainment, unexpectedness, and retention.',
  },
  {
    icon: Scissors,
    title: 'Automatic Vertical Edit',
    desc: 'Rendered as 1080×1920 with streamer footage on top and original content on bottom. Auto-captions included.',
  },
  {
    icon: Download,
    title: 'Export-Ready MP4',
    desc: 'Download fully-rendered, platform-ready clips. No manual editing required.',
  },
]

const steps = [
  { n: '01', label: 'Paste YouTube URL' },
  { n: '02', label: 'Describe what you want in plain English' },
  { n: '03', label: 'AI analyzes & scores every moment' },
  { n: '04', label: 'Download your vertical clips' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-forge-border/50 bg-forge-bg/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forge-gradient flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gradient">ClipForge AI</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="forge-btn-primary text-sm"
          >
            Open Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* BG glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-glow-purple pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-glow-cyan pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-accent-dim/50 border border-forge-accent/30 text-forge-accent-light text-xs font-medium mb-6">
            <Zap size={12} />
            Fully Autonomous AI Video Clipping
          </div>

          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight tracking-tight">
            Turn Long Videos Into{' '}
            <span className="text-gradient">Viral Clips</span>
            {' '}Automatically
          </h1>

          <p className="text-xl text-forge-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste a YouTube URL, describe what you want in plain English, and ClipForge AI
            extracts, scores, and renders professional vertical clips — no manual editing.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/projects/new')}
              className="forge-btn-primary text-base px-8 py-3.5 group"
            >
              Start Clipping Free
              <ArrowRight size={18} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="forge-btn-secondary text-base px-8 py-3.5"
            >
              View Dashboard
            </button>
          </div>

          {/* Example instruction */}
          <div className="mt-14 max-w-2xl mx-auto">
            <div className="forge-card p-5 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-forge-gradient opacity-50" />
              <p className="text-xs text-forge-muted mb-2 font-medium uppercase tracking-widest">
                Example Instruction
              </p>
              <p className="text-forge-text font-mono text-sm leading-relaxed">
                "Get me <span className="text-forge-accent-light">4 funny and unexpected clips</span> between{' '}
                <span className="text-forge-cyan">9:15 and 1:10:15</span>. Each clip should be{' '}
                <span className="text-forge-green">30–60 seconds</span>. Add minimal captions."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-forge-border/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map(({ n, label }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-forge-elevated border border-forge-border flex items-center justify-center mx-auto mb-4">
                  <span className="text-forge-accent font-black font-mono text-lg">{n}</span>
                </div>
                <p className="text-sm text-forge-subtle font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">Everything You Need</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="forge-card p-6 hover:border-forge-accent/40 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-forge-accent-dim flex items-center justify-center mb-4">
                  <Icon size={22} className="text-forge-accent-light" />
                </div>
                <h3 className="font-semibold text-forge-text mb-2">{title}</h3>
                <p className="text-sm text-forge-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video layout visual */}
      <section className="py-20 px-6 bg-forge-surface/40 border-y border-forge-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Vertical-First Output</h2>
          <p className="text-forge-muted mb-12 max-w-xl mx-auto">
            Every clip is rendered as 1080×1920 — perfect for TikTok, Shorts, and Reels.
          </p>

          <div className="flex justify-center">
            <div className="w-48 aspect-[9/16] rounded-2xl overflow-hidden border-2 border-forge-border shadow-glow relative">
              {/* Top 35% */}
              <div className="h-[35%] bg-forge-elevated flex items-center justify-center border-b border-forge-border">
                <div className="text-center">
                  <p className="text-xs text-forge-cyan font-semibold">STREAMER</p>
                  <p className="text-xs text-forge-muted mt-0.5">35%</p>
                </div>
              </div>
              {/* Bottom 65% */}
              <div className="h-[65%] bg-forge-bg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-forge-accent-light font-semibold">CONTENT</p>
                  <p className="text-xs text-forge-muted mt-0.5">65%</p>
                </div>
              </div>
              {/* Caption bar */}
              <div className="absolute bottom-6 left-3 right-3 bg-black/80 rounded px-2 py-1">
                <p className="text-xs text-white text-center font-medium">Auto Captions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">
            Ready to <span className="text-gradient">Forge Your Clips?</span>
          </h2>
          <p className="text-forge-muted mb-8">
            No manual editing. No complicated timelines. Just your URL and your ideas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/projects/new')}
              className="forge-btn-primary text-base px-8 py-3.5"
            >
              Get Started Now
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-forge-muted">
            {['No credit card', 'No export limits', 'Full MP4 download'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-forge-green" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forge-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-forge-accent" />
            <span className="text-sm font-semibold text-forge-muted">ClipForge AI</span>
          </div>
          <p className="text-xs text-forge-muted">Autonomous AI Video Clipping Platform</p>
        </div>
      </footer>
    </div>
  )
}
