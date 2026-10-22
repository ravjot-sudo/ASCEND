import type { Metadata } from "next";
import { Sequencer } from "@/components/Sequencer";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Sequencer, Undertow EP",
  description: "Rebuild the Undertow tracks step by step: four kits, four patterns each, every sound synthesised in your browser.",
};

export default function SequencerPage() {
  return (
    <>
      <div aria-hidden className="grain-layer pointer-events-none fixed inset-0 -z-[5]" />
      <SiteHeader active="sequencer" />
      <h1 className="sr-only">Undertow sequencer</h1>
      <Sequencer />
    </>
  );
}
