export function SkylineAnimation() {
  return (
    <div className="absolute inset-x-0 bottom-[-6vh] pointer-events-none overflow-hidden h-[70vh] md:h-[65vh]">
      {/* Vignette and horizon glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,227,245,0.14)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-truecost-bg-primary via-transparent to-transparent opacity-70" />

      {/* Grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-40 opacity-40">
        <div className="skyline-grid h-full w-full" />
      </div>

      {/* Skyline */}
      <div className="absolute inset-x-0 bottom-0 h-[55vh] md:h-[52vh] flex items-end justify-center gap-2 md:gap-4 lg:gap-6 px-4 md:px-10">
        {[
          { h: '44', delay: 'animate-skyline-rise-1', w: '10' },
          { h: '60', delay: 'animate-skyline-rise-2', w: '12' },
          { h: '36', delay: 'animate-skyline-rise-3', w: '9' },
          { h: '72', delay: 'animate-skyline-rise-4', w: '14' },
          { h: '50', delay: 'animate-skyline-rise-5', w: '11' },
          { h: '78', delay: 'animate-skyline-rise-3', w: '16' },
          { h: '42', delay: 'animate-skyline-rise-2', w: '9' },
          { h: '64', delay: 'animate-skyline-rise-1', w: '12' },
          { h: '38', delay: 'animate-skyline-rise-4', w: '8' },
          { h: '54', delay: 'animate-skyline-rise-5', w: '10' },
        ].map((b, idx) => (
          <div
            key={idx}
            className={`skyline-bar ${b.delay}`}
            style={{
              height: `${b.h}vh`,
              width: `${b.w}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

