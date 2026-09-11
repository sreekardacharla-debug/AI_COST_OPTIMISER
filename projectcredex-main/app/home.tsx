'use client'
import React, { useEffect, useRef } from 'react'
import Link from "next/link"
import Navbar from './navbar/page'

const Home = () => {
    const heroRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const el = heroRef.current
        if (!el) return
        el.classList.add('hero-visible')
    }, [])

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        * { box-sizing: border-box; }

        body {
          background: #f8faff;
          font-family: 'DM Sans', sans-serif;
          margin: 0;
          overflow-x: hidden;
        }

        .hero-section {
          min-height: 100vh;
          background: #f8faff;
          position: relative;
          overflow: hidden;
        }

        /* Soft mesh background */
        .hero-section::before {
          content: '';
          position: absolute;
          top: -200px;
          right: -200px;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle at center, #bfdfff 0%, transparent 65%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .hero-section::after {
          content: '';
          position: absolute;
          bottom: -150px;
          left: -100px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle at center, #d6edff 0%, transparent 65%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        /* HERO WRAPPER */
        .hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 120px 80px 80px;
          gap: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* LEFT */
        .hero-left {
          max-width: 620px;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .hero-visible .hero-left {
          opacity: 1;
          transform: translateY(0);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #e8f4ff;
          border: 1px solid #c2deff;
          color: #0285c7;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 32px;
        }
        .badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0ea5e9;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: 76px;
          font-weight: 800;
          line-height: 1.03;
          color: #060f2e;
          margin: 0 0 8px;
          letter-spacing: -2px;
        }
        .hero-title .accent {
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          margin: 28px 0 0;
          font-size: 19px;
          color: #64748b;
          line-height: 1.65;
          max-width: 480px;
          font-weight: 400;
        }

        /* CTA ROW */
        .cta-row {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 44px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          padding: 16px 32px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(14, 165, 233, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(14, 165, 233, 0.45);
        }
        .btn-primary svg { transition: transform 0.2s; }
        .btn-primary:hover svg { transform: translateX(4px); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #374151;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }
        .btn-secondary:hover { color: #0ea5e9; }

        /* STATS ROW */
        .stats-row {
          display: flex;
          gap: 40px;
          margin-top: 56px;
          padding-top: 40px;
          border-top: 1px solid #e2eaf5;
        }
        .stat-item {}
        .stat-number {
          font-family: 'Syne', sans-serif;
          font-size: 30px;
          font-weight: 700;
          color: #060f2e;
          letter-spacing: -1px;
        }
        .stat-label {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 3px;
          font-weight: 400;
        }

        /* RIGHT / IMAGE CARD */
        .hero-right {
          flex: 0 0 auto;
          width: 48%;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transform: translateY(28px) scale(0.97);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }
        .hero-visible .hero-right {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .image-card {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          background: #eef4fb;
          padding: 10px;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 12px 40px rgba(14, 100, 180, 0.12),
            0 0 0 1px rgba(200, 220, 255, 0.6);
          width: 100%;
          max-width: 580px;
        }
        .image-card img {
          width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
          border-radius: 20px;
        }

        /* Floating pill badges on image */
        .float-badge {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-radius: 100px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }
        .float-badge-1 {
          top: 24px;
          left: -20px;
          animation: floatA 4s ease-in-out infinite;
        }
        .float-badge-2 {
          bottom: 40px;
          right: -20px;
          animation: floatB 4.5s ease-in-out infinite;
        }
        .float-badge-3 {
          top: 50%;
          right: -24px;
          transform: translateY(-50%);
          animation: floatA 5s ease-in-out infinite 1s;
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .badge-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .green { background: #dcfce7; color: #16a34a; }
        .blue  { background: #dbeafe; color: #2563eb; }
        .amber { background: #fef9c3; color: #ca8a04; }

        /* FEATURES STRIP */
        .features-strip {
          background: #fff;
          border-top: 1px solid #e8f0fa;
          border-bottom: 1px solid #e8f0fa;
          padding: 48px 80px;
          position: relative;
          z-index: 1;
        }
        .features-strip-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding: 28px;
          border-radius: 18px;
          border: 1px solid #e8f0fa;
          background: #fafcff;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .feature-card:hover {
          box-shadow: 0 8px 32px rgba(14, 100, 180, 0.1);
          transform: translateY(-3px);
        }
        .feature-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e0f2fe, #bfdbfe);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon-wrap svg { color: #0ea5e9; }
        .feature-title {
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }
        .feature-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .hero-inner { flex-direction: column; padding: 100px 32px 60px; }
          .hero-right { width: 100%; }
          .hero-title { font-size: 56px; }
          .features-strip-inner { grid-template-columns: 1fr; }
          .features-strip { padding: 40px 32px; }
        }
        @media (max-width: 640px) {
          .hero-title { font-size: 42px; letter-spacing: -1px; }
          .stats-row { gap: 24px; }
        }
      `}</style>

            <Navbar />

            <div className="hero-section">
                <div className="hero-inner" ref={heroRef}>

                    {/* LEFT */}
                    <div className="hero-left">
                        <div className="badge">
                            <span className="badge-dot" />
                            AI Subscription Intelligence
                        </div>

                        <h1 className="hero-title">
                            Stop Overpaying<br />
                            your <span className="accent">AI tools</span>
                        </h1>

                        <p className="hero-subtitle">
                            Discover, analyze, and optimize every AI subscription you own — all in one intelligent dashboard.
                        </p>

                        <div className="cta-row">
                            <Link href="/auditpage" className="btn-primary">
                                Start Free Audit
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                            <a href="#how-it-works" className="btn-secondary">
                                See how it works
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                                    <path d="M5.5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </a>
                        </div>

                        <div className="stats-row">
                            <div className="stat-item">
                                <div className="stat-number">$2.4k</div>
                                <div className="stat-label">Avg. savings / year</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">40+</div>
                                <div className="stat-label">AI tools tracked</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">3 min</div>
                                <div className="stat-label">Setup time</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="hero-right">
                        <div className="image-card">
                            <div className="float-badge float-badge-1">
                                <div className="badge-icon green">↓</div>
                                Saved $340 this month
                            </div>

                            <img
                                src="/ChatGPT%20Image%20May%209,%202026,%2005_02_47%20PM.png"
                                alt="OptiBlue AI Dashboard"
                            />

                            <div className="float-badge float-badge-2">
                                <div className="badge-icon blue">✦</div>
                                12 tools optimized
                            </div>

                            <div className="float-badge float-badge-3">
                                <div className="badge-icon amber">!</div>
                                3 unused subs found
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* FEATURES STRIP */}
            <div className="features-strip">
                <div className="features-strip-inner">

                    <div className="feature-card">
                        <div className="feature-icon-wrap">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                        </div>
                        <div>
                            <p className="feature-title">Smart Discovery</p>
                            <p className="feature-desc">Automatically detect every AI subscription tied to your accounts — nothing slips through.</p>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrap">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div>
                            <p className="feature-title">Usage Analytics</p>
                            <p className="feature-desc">See exactly how much you use each tool and where your money is going — down to the dollar.</p>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrap">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                        <div>
                            <p className="feature-title">AI Recommendations</p>
                            <p className="feature-desc">Get personalized suggestions to cut, downgrade, or consolidate subscriptions and maximize savings.</p>
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}

export default Home