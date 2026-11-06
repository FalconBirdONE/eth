"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { motion, MotionConfig, type HTMLMotionProps } from "motion/react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -88 } });
    return () => lenis.destroy();
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its children into view once, when scrolled to. */
export function Reveal({
  delay = 0,
  y = 24,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    />
  );
}
