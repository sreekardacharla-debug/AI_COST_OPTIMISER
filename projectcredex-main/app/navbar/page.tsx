"use client"

import React, { useState, useEffect } from 'react'
import Link from "next/link"
import { usePathname } from "next/navigation"

const Navbar = () => {

    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12)
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const navLinks = [
        { label: "Home", href: "/" },
        { label: "Audit", href: "/auditpage" },
        { label: "Recommendations", href: "/recommendations" },
        { label: "History", href: "auditHistory" },
        { label: "about", href: "/about" },
    ]

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

                .nav-root {
                    font-family: 'DM Sans', sans-serif;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: #070F2B;
                    transition: box-shadow 0.3s, background 0.3s;
                }

                .nav-root.scrolled {
                    background: rgba(7, 15, 43, 0.92);
                    box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.28);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                }

                .brand-name {
                    font-family: 'Syne', sans-serif;
                    font-weight: 800;
                    font-size: 22px;
                    letter-spacing: -0.3px;
                    color: #fff;
                    line-height: 1;
                }

                .brand-name span {
                    color: #3B6FFF;
                }

                .nav-link {
                    font-size: 14px;
                    font-weight: 500;
                    color: #8A97B8;
                    letter-spacing: 0.01em;
                    padding: 6px 2px;
                    position: relative;
                    transition: color 0.18s;
                    white-space: nowrap;
                }

                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 0;
                    height: 1.5px;
                    background: #3B6FFF;
                    border-radius: 2px;
                    transition: width 0.22s cubic-bezier(.4,0,.2,1);
                }

                .nav-link:hover { color: #fff; }
                .nav-link:hover::after { width: 100%; }

                .nav-link.active {
                    color: #fff;
                }

                .nav-link.active::after {
                    width: 100%;
                }

                .get-started-btn {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    color: #fff;
                    background: #3B6FFF;
                    border: none;
                    border-radius: 10px;
                    padding: 10px 22px;
                    cursor: pointer;
                    transition: background 0.18s, box-shadow 0.18s, transform 0.14s;
                    box-shadow: 0 2px 14px rgba(59,111,255,0.32);
                    letter-spacing: 0.01em;
                }

                .get-started-btn:hover {
                    background: #2A5CE0;
                    box-shadow: 0 4px 20px rgba(59,111,255,0.44);
                    transform: translateY(-1px);
                }

                .get-started-btn:active {
                    transform: translateY(0);
                }

                .logo-ring {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #3B6FFF 0%, #1A3FCC 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 12px rgba(59,111,255,0.35);
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .divider-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #1E2B4A;
                }
            `}</style>

            <nav className={`nav-root ${scrolled ? 'scrolled' : ''}`}>
                <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between">

                    <Link href="/" className="flex items-center gap-3 no-underline">
                        <div className="logo-ring">
                            <img
                                src="/1234.png"
                                alt="OptiBlue AI"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="brand-name">
                            OPTI<span>BLUE</span> AI
                        </span>
                    </Link>

                    <div className="flex items-center gap-8">
                        {navLinks.map((link, i) => (
                            <React.Fragment key={link.label}>
                                <Link
                                    href={link.href}
                                    className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                                >
                                    {link.label}
                                </Link>
                                {i === 2 && <span className="divider-dot" />}
                            </React.Fragment>
                        ))}

                        <Link href="/auditpage">
                            <button className="get-started-btn ml-2">
                                Start Free Audit
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>
        </>
    )
}

export default Navbar
