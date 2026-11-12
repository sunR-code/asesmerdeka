/**
 * Motion Presets (Dashboard V21 Animation System)
 * Menggunakan spring physics alami (Emil Kowalski / Jakub Krehel motion design principles)
 */

export const springPillTransition = {
  type: 'spring' as const,
  stiffness: 450,
  damping: 32,
};

export const cardHoverMotion = {
  y: -4,
  transition: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 22,
  },
};

export const cardTapMotion = {
  scale: 0.985,
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export const bentoCardVariants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 26,
    },
  },
};

export const tabContentVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.14 },
  },
};

export const workspaceSectionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export const workspacePopoverVariants = {
  initial: { opacity: 0, scale: 0.97, y: 4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 2,
    transition: { duration: 0.12 },
  },
};

export const workspaceAccordionTransition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1] as const,
};

export const workspaceSegmentTransition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1] as const,
};

