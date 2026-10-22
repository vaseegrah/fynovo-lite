"use client";

import { type FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-canvas p-5"><div className="mx-auto grid min-h-[calc(100vh-40px)] max-w-5xl overflow-hidden rounded-4xl border border-line bg-white shadow-card lg:grid-cols-2"><section className="hidden bg-ink p-10 text-white lg:flex lg:flex-col"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-xl font-bold">F</span><b className="text-lg">Fynovo Finance</b></div><div className="my-auto"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B8F2DD]">A clearer business picture</p><h1 className="mt-4 text-4xl font-semibold leading-tight">Every rupee, working harder for you.</h1><p className="mt-5 max-w-sm leading-7 text-slate-300">See income, expenses and your profit position in one focused workspace—built around your Fynovo records.</p></div><div className="flex items-center gap-2 text-sm text-slate-300"><ShieldCheck size={17} className="text-[#B8F2DD]" />Secure, server-side API connections</div></section><section className="flex items-center p-6 sm:p-10"><div className="mx-auto w-full max-w-sm"><div className="lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">F</span><h1 className="mt-5 text-2xl font-semibold">Fynovo Finance</h1></div><h2 className="mt-8 text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your workspace"}</h2><p className="mt-2 text-sm text-muted">{mode === "login" ? "Sign in to see your financial pulse." : "Set up your secure finance workspace."}</p><form className="mt-7 space-y-4" onSubmit={submit}>{mode === "register" && <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand" placeholder="Your name" /></label>}<label className="block"><span className="mb-1.5 block text-sm font-medium">Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand" placeholder="you@company.com" /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Password</span><div className="relative"><input required minLength={8} type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 pr-11 outline-none focus:border-brand" placeholder="At least 8 characters" /><button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-muted" aria-label="Toggle password visibility">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}<button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={17} /></>}</button></form><p className="mt-6 text-center text-sm text-muted">{mode === "login" ? "New to Fynovo Finance?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-brand">{mode === "login" ? "Create account" : "Sign in"}</button></p></div></section></div></main>;
}
