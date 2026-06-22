const LEFT_DECOR = [
  { e: '🌴', cls: 'top-[5%] left-[6%] text-[9rem]', d: '0s', o: 'opacity-90' },
  { e: '🌿', cls: 'top-[38%] left-[16%] text-[6rem]', d: '1.2s', o: 'opacity-80' },
  { e: '🦜', cls: 'top-[63%] left-[5%] text-[7rem]', d: '2.4s', o: 'opacity-90' },
  { e: '🍃', cls: 'top-[85%] left-[20%] text-[5rem]', d: '0.6s', o: 'opacity-70' },
];

const RIGHT_DECOR = [
  { e: '🌴', cls: 'top-[7%] right-[7%] text-[9rem] -scale-x-100', d: '1.8s', o: 'opacity-90' },
  { e: '🌺', cls: 'top-[36%] right-[17%] text-[5.5rem]', d: '3s', o: 'opacity-85' },
  { e: '🐒', cls: 'top-[61%] right-[5%] text-[7rem]', d: '0.4s', o: 'opacity-90' },
  { e: '🌿', cls: 'top-[84%] right-[19%] text-[6rem] -scale-x-100', d: '2.2s', o: 'opacity-75' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden font-body text-text-dark"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 0%, #FBFAF5 0%, #EAF4ED 55%, #D9EFE0 100%)',
      }}
    >
      {/* Tropical foliage framing the content — desktop only */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-y-0 left-0 z-0 hidden w-[26vw] max-w-[340px] overflow-hidden lg:block">
        {LEFT_DECOR.map((d, i) => (
          <span key={i} className={`absolute animate-sway ${d.cls} ${d.o}`} style={{ animationDelay: d.d }}>
            {d.e}
          </span>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none select-none fixed inset-y-0 right-0 z-0 hidden w-[26vw] max-w-[340px] overflow-hidden lg:block">
        {RIGHT_DECOR.map((d, i) => (
          <span key={i} className={`absolute inline-block animate-sway ${d.cls} ${d.o}`} style={{ animationDelay: d.d }}>
            {d.e}
          </span>
        ))}
      </div>

      {/* Main content — each screen renders its own green ScreenHeader band */}
      <div className="relative z-10 max-w-[600px] mx-auto px-[18px] pt-5 pb-10">
        {children}
      </div>
    </div>
  );
}
