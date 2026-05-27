"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  fire?: boolean;
  type?: "burst" | "school" | "fireworks";
}

export function fireConfetti(type: "burst" | "school" | "fireworks" = "burst") {
  if (typeof window === "undefined") return;

  const colors = ["#0F6E56", "#085041", "#E1F5EE", "#534AB7", "#FFD700"];

  if (type === "burst") {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.65 },
      colors: colors,
      zIndex: 9999,
    });
  } else if (type === "school") {
    const end = Date.now() + 2 * 1000;

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  } else if (type === "fireworks") {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, colors: colors };

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() - 0.2 } });
    }, 250);
  }
}

export default function Confetti({ fire = false, type = "burst" }: ConfettiProps) {
  useEffect(() => {
    if (fire) {
      fireConfetti(type);
    }
  }, [fire, type]);

  return null;
}
