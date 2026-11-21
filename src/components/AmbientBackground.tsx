"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function AmbientBackground() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { damping: 35, stiffness: 120 });
  const smoothY = useSpring(mouseY, { damping: 35, stiffness: 120 });

  const orb1X = useTransform(smoothX, [0, 1], [-60, 60]);
  const orb1Y = useTransform(smoothY, [0, 1], [-60, 60]);

  const orb2X = useTransform(smoothX, [0, 1], [70, -70]);
  const orb2Y = useTransform(smoothY, [0, 1], [50, -50]);

  const gridRotateX = useTransform(smoothY, [0, 1], [4, -4]);
  const gridRotateY = useTransform(smoothX, [0, 1], [-4, 4]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070B]">
      {/* Subtle 3D perspective grid */}
      <div className="perspective-1000 absolute inset-0 flex items-center justify-center opacity-25">
        <motion.div
          style={{
            rotateX: gridRotateX,
            rotateY: gridRotateY,
          }}
          className="h-[130vh] w-[130vw] bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
        />
      </div>

      {/* Reactive Neon Orb 1 - Cyan/Blue */}
      <motion.div
        style={{ x: orb1X, y: orb1Y }}
        className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[130px]"
      />

      {/* Reactive Neon Orb 2 - Rose/Violet */}
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="absolute -bottom-40 -right-32 h-[580px] w-[580px] rounded-full bg-rose-500/15 blur-[140px]"
      />

      {/* Center Deep Violet Ambient Glow */}
      <motion.div
        style={{ x: orb1Y, y: orb2X }}
        className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[150px]"
      />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#05070B_90%)]" />
    </div>
  );
}
