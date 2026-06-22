export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-text-dark">
      {/* Each screen renders its own in-flow green ScreenHeader band */}
      <div className="relative z-10 max-w-[480px] mx-auto px-[18px] pt-5 pb-10">
        {children}
      </div>
    </div>
  );
}
