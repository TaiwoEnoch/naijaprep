import { Variants } from "framer-motion";

// Every page transition: fade + slide up, 350ms, never instant
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 1, 0.5, 1], // easeOutQuart
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

// Every button: scale(0.97) on press, 150ms
export const buttonPressVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.97 },
};

// Every card: lift 3px + shadow on hover
export const cardHoverVariants = {
  initial: { y: 0, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  hover: {
    y: -3,
    boxShadow: "0 12px 30px rgba(15, 110, 86, 0.15)",
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

// Every list: stagger children 60ms apart
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

// Errors: gentle shake animation
export const shakeVariants: Variants = {
  shake: {
    x: [0, -6, 6, -6, 6, -4, 4, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

// Modals: spring animation in, fade out
export const modalSpringVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

// Fade variant for general transitions
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0 },
};
