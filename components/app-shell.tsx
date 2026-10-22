"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, CircleDollarSign, House, LogOut, WalletCards } from "lucide-react";
import type { ComponentType } from "react";

const navigation: { href: "/" | "/income" | "/expenses" | "/reports" | "/settings"; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { href: "/", label: "Home", icon: House }, { href: "/income", label: "Income", icon: CircleDollarSign },
  { href: "/expenses", label: "Expenses", icon: WalletCards }, { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }); }, []);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };
  return <div className="min-h-screen overflow-x-hidden bg-canvas"><aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white p-5 md:block"><Link href="/" className="mb-10 flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">F</span><span><strong className="block text-lg">Fynovo</strong><small className="text-muted">Finance workspace</small></span></Link><nav className="space-y-1">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${path === href ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-50 hover:text-ink"}`}><Icon size={19} strokeWidth={path === href ? 2.5 : 2} />{label}</Link>)}</nav><button onClick={logout} className="absolute bottom-6 flex items-center gap-3 px-3 py-3 text-sm font-medium text-muted hover:text-danger"><LogOut size={18} />Sign out</button></aside><main className="min-w-0 md:ml-64">{children}</main></div>;
}
