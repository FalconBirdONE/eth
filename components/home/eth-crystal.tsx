"use client";
import { useRef } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// Pure-CSS 3D Ethereum octahedron: a tall upper pyramid over a short lower one, 4 faces each.
const A = 88; // half-width of the square "equator"
const UP = 185; // upper apex height
const DOWN = 100; // lower apex height
const upTilt = (Math.atan(A / UP) * 180) / Math.PI;
const downTilt = (Math.atan(A / DOWN) * 180) / Math.PI;
const upSlant = Math.hypot(A, UP);
const downSlant = Math.hypot(A, DOWN);
const shades = ["oklch(0.18 0.006 265)", "oklch(0.52 0.006 265)", "oklch(0.28 0.006 265)", "oklch(0.7 0.006 265)"];
const IDLE_SPEED = 0.03; // deg per ms

function Face({ i, upper }: { i: number; upper: boolean }) {
  const h = upper ? upSlant : downSlant;
  return (
    <div
      className="absolute left-1/2 top-1/2 border-0"
      style={{
        width: A * 2,
        height: h,
        marginLeft: -A,
        marginTop: upper ? -h : 0,
        transformOrigin: upper ? "50% 100%" : "50% 0%",
        transform: `rotateY(${i * 90}deg) translateZ(${A}px) rotateX(${upper ? upTilt : -downTilt}deg)`,
        clipPath: upper ? "polygon(50% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 50% 100%)",
        background: `linear-gradient(${upper ? 180 : 0}deg, ${shades[(i + (upper ? 0 : 2)) % 4]}, ${shades[(i + 1) % 4]})`,
        backfaceVisibility: "hidden",
      }}
    />
  );
}

export function EthCrystal() {
  const reduce = useReducedMotion();
  const rotY = useMotionValue(20);
  const tiltTarget = useMotionValue(-14);
  const rotX = useSpring(tiltTarget, { stiffness: 120, damping: 14 });
  const velocity = useRef(IDLE_SPEED);
  const drag = useRef<{ x: number; t: number } | null>(null);
  const transform = useTransform([rotX, rotY], ([x, y]) => `rotateX(${x}deg) rotateY(${y}deg)`);
  const shadowScale = useTransform(rotX, [-40, 0, 40], [0.8, 1, 0.8]);

  useAnimationFrame((_, delta) => {
    if (drag.current) return;
    // Ease any fling back toward the idle spin.
    const idle = reduce ? 0 : IDLE_SPEED;
    velocity.current += (idle - velocity.current) * 0.03;
    rotY.set(rotY.get() + velocity.current * Math.min(delta, 50));
  });

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
      <div aria-hidden="true" className="absolute inset-8 rounded-full bg-foreground/[0.04] blur-3xl" />
      <div aria-hidden="true" className="absolute inset-6 rounded-full border border-dashed border-border-strong/60 animate-[spin_60s_linear_infinite]" />
      <div aria-hidden="true" className="absolute inset-16 rounded-full border border-border" />
      <motion.div
        role="img"
        aria-label="Ethereum logo in 3D. Drag to spin, click to flip."
        className="relative size-full cursor-grab touch-none active:cursor-grabbing"
        style={{ perspective: 900 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, t: e.timeStamp };
          velocity.current = 0;
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          tiltTarget.set(-14 - ((e.clientY - rect.top) / rect.height - 0.5) * 40);
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dt = Math.max(e.timeStamp - drag.current.t, 1);
          rotY.set(rotY.get() + dx * 0.6);
          velocity.current = (dx * 0.6) / dt;
          drag.current = { x: e.clientX, t: e.timeStamp };
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => tiltTarget.set(-14)}
        onClick={() => {
          if (Math.abs(velocity.current) < 0.1) velocity.current += 1.2;
        }}
      >
        <motion.div
          className="absolute left-1/2 top-[58%] size-0"
          style={{ transformStyle: "preserve-3d", transform }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Face key={`u${i}`} i={i} upper />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Face key={`d${i}`} i={i} upper={false} />
          ))}
        </motion.div>
        <motion.div
          aria-hidden="true"
          className="absolute bottom-[8%] left-1/2 h-4 w-32 -translate-x-1/2 rounded-[50%] bg-foreground/15 blur-md"
          style={{ scaleX: shadowScale }}
        />
      </motion.div>
      <span className="pointer-events-none absolute bottom-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        Drag to spin · click to boost
      </span>
    </div>
  );
}
