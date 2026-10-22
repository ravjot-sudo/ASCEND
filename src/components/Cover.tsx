// Front cover for the gate: the ASCEND artwork — the chrome word, "PRESENTING PEGASSI" caption and
// star glints are baked into the picture, so it renders as a single full-bleed image.
export function Cover() {
  return (
    <span className="cover" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/ascend-cover.jpeg" alt="" className="absolute inset-0 size-full object-cover" />
    </span>
  );
}
