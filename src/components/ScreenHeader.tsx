export default function ScreenHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-[18px] -mt-5 mb-6 overflow-hidden rounded-b-[32px] bg-gradient-to-br from-jungle via-canopy to-leaf px-[22px] pt-8 pb-7 shadow-[0_10px_30px_rgba(45,106,79,0.22)]">
      <div className="pointer-events-none absolute -top-5 -right-3 text-6xl opacity-20 select-none">🌴</div>
      <div className="relative">{children}</div>
    </div>
  );
}
