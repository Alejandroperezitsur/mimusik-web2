/** Quiet Analog Atelier: the application shell stays immediate while the listening workspace loads as a focused local tool. */
import { lazy, Suspense } from "react";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
function ShellFallback() { return <main className="grid min-h-dvh place-items-center bg-[#151918] text-[#BFDACD]"><div className="text-center"><span className="font-display text-3xl tracking-[-.06em]">MiMusik</span><p className="mt-2 text-xs uppercase tracking-[.18em] text-[#779387]">Opening local library</p></div></main>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster theme="dark" richColors position="top-center" /><Router hook={useHashLocation}><Suspense fallback={<ShellFallback />}><Home /></Suspense></Router></TooltipProvider></ThemeProvider></ErrorBoundary>; }
