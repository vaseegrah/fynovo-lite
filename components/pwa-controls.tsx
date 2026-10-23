"use client";

import { Download, Radio } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!promptEvent) {
      setShowInstructions(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  return <div className="relative"><button type="button" onClick={install} aria-label="Download Fynovo as an app" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand/20 bg-brand-soft px-2 sm:px-2.5 text-xs font-semibold text-brand transition hover:bg-brand/15" title="Download Fynovo as an app"><Download size={15} /><span className="hidden sm:inline">Download app</span></button>{showInstructions && <span role="status" className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-white p-3 text-xs leading-5 text-muted shadow-card">Use your browser menu and choose “Install app” or “Add to Home Screen”.</span>}</div>;
}

export function RealtimeStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return <span role="status" aria-live="polite" title={online ? "Live connection" : "Offline"} className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 text-[10px] font-semibold sm:text-xs ${online ? "border-brand/20 bg-brand-soft text-brand" : "border-danger/20 bg-danger-soft text-danger"}`}><span className="relative grid h-4 w-4 place-items-center"><Radio size={16} strokeWidth={2.2} /><i className={`absolute right-[-1px] top-0 h-1.5 w-1.5 rounded-full ring-2 ring-white ${online ? "animate-pulse bg-brand" : "bg-danger"}`} /></span><span>{online ? "Live" : "Offline"}</span></span>;
}
