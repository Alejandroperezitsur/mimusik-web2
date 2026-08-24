import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent>();
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    setInstalled(standalone);
    setIsIos(ios);
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(undefined); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const requestInstall = async () => {
    if (!prompt) return "unsupported" as const;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome !== "accepted") setPrompt(undefined);
    return choice.outcome;
  };

  return { installed, canPrompt: Boolean(prompt), isIos, requestInstall };
}
