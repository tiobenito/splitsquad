export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-text-dark">
      {/* Fixed gradient header with chevron clip-path */}
      <div
        className="fixed top-0 left-0 right-0 h-[220px] bg-gradient-to-br from-jungle via-canopy to-leaf z-0"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)' }}
      />

      {/* Swaying leaf decorations */}
      <div className="fixed pointer-events-none z-0 opacity-10 text-4xl animate-sway" style={{ top: '12%', left: '4%' }}>🌿</div>
      <div className="fixed pointer-events-none z-0 opacity-10 text-3xl animate-sway" style={{ top: '45%', right: '3%', animationDelay: '1.5s' }}>🍃</div>
      <div className="fixed pointer-events-none z-0 opacity-10 text-2xl animate-sway" style={{ top: '72%', left: '6%', animationDelay: '3s' }}>🌱</div>

      {/* Main content */}
      <div className="relative z-10 max-w-[480px] mx-auto px-[18px] pt-5 pb-10">
        {children}
      </div>
    </div>
  );
}
