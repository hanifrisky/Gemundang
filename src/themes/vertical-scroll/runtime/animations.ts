import { LayerAnimationConfig } from '@/types/verticalScroll';

export const IDLE_KEYFRAMES_CSS = `
@keyframes vscroll-float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes vscroll-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes vscroll-shimmer {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(251, 191, 36, 0));
  }
  50% {
    filter: brightness(1.25) drop-shadow(0 0 12px rgba(251, 191, 36, 0.45));
  }
}

@keyframes vscroll-breathing {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

@keyframes vscroll-sway {
  0%, 100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}
`;

export function getEasingCSS(easing?: string): string {
  switch (easing) {
    case 'linear':
      return 'linear';
    case 'ease-in-out':
      return 'cubic-bezier(0.4, 0, 0.2, 1)';
    case 'spring':
      return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    case 'bounce':
      return 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    case 'ease-out':
    default:
      return 'cubic-bezier(0.16, 1, 0.3, 1)';
  }
}

export function computeEntryExitStyles(
  animConfig: LayerAnimationConfig | undefined,
  stage: 'initial' | 'entered' | 'exited'
): React.CSSProperties {
  if (!animConfig) return {};
  const { entry, exit } = animConfig;
  const easing = getEasingCSS(entry?.easing);
  const duration = `${entry?.duration ?? 0.8}s`;
  const delay = `${entry?.delay ?? 0}s`;

  if (stage === 'initial') {
    switch (entry?.type) {
      case 'fade-in':
        return { opacity: 0, transition: `opacity ${duration} ${easing} ${delay}` };
      case 'slide-up':
        return { opacity: 0, transform: 'translateY(45px)', transition: `all ${duration} ${easing} ${delay}` };
      case 'slide-down':
        return { opacity: 0, transform: 'translateY(-45px)', transition: `all ${duration} ${easing} ${delay}` };
      case 'slide-left':
        return { opacity: 0, transform: 'translateX(50px)', transition: `all ${duration} ${easing} ${delay}` };
      case 'slide-right':
        return { opacity: 0, transform: 'translateX(-50px)', transition: `all ${duration} ${easing} ${delay}` };
      case 'zoom-in':
        return { opacity: 0, transform: 'scale(0.65)', transition: `all ${duration} ${easing} ${delay}` };
      case 'bounce-in':
        return { opacity: 0, transform: 'scale(0.4)', transition: `all ${duration} ${easing} ${delay}` };
      case 'flip-in':
        return { opacity: 0, transform: 'perspective(400px) rotateY(90deg)', transition: `all ${duration} ${easing} ${delay}` };
      case 'none':
      default:
        return { opacity: 1, transform: 'none' };
    }
  }

  if (stage === 'exited' && exit && exit.type !== 'none') {
    const exitDuration = `${exit.duration ?? 0.6}s`;
    const exitDelay = `${exit.delay ?? 0}s`;

    switch (exit.type) {
      case 'fade-out':
        return { opacity: 0, transition: `opacity ${exitDuration} ease-in ${exitDelay}` };
      case 'slide-down':
        return { opacity: 0, transform: 'translateY(40px)', transition: `all ${exitDuration} ease-in ${exitDelay}` };
      case 'slide-up':
        return { opacity: 0, transform: 'translateY(-40px)', transition: `all ${exitDuration} ease-in ${exitDelay}` };
      case 'zoom-out':
        return { opacity: 0, transform: 'scale(0.7)', transition: `all ${exitDuration} ease-in ${exitDelay}` };
      case 'blur-out':
        return { opacity: 0, filter: 'blur(8px)', transition: `all ${exitDuration} ease-in ${exitDelay}` };
      default:
        return { opacity: 0, transition: `opacity ${exitDuration} ease-in ${exitDelay}` };
    }
  }

  return {
    opacity: 1,
    transform: 'none',
    filter: 'none',
    transition: `all ${duration} ${easing} ${delay}`
  };
}

export function computeIdleAnimationStyle(
  animConfig: LayerAnimationConfig | undefined,
  stage: 'initial' | 'entered' | 'exited'
): React.CSSProperties {
  if (!animConfig || stage === 'initial') return {};
  if (stage === 'exited' && animConfig.exit && animConfig.exit.type !== 'none') return {};

  const idle = animConfig.idle;
  if (!idle || idle.type === 'none') return {};

  const idleDuration = `${idle.duration || 3.5}s`;
  switch (idle.type) {
    case 'float':
      return { animation: `vscroll-float ${idleDuration} ease-in-out infinite` };
    case 'pulse':
      return { animation: `vscroll-pulse ${idleDuration} ease-in-out infinite` };
    case 'shimmer':
      return { animation: `vscroll-shimmer ${idleDuration} ease-in-out infinite` };
    case 'breathing':
      return { animation: `vscroll-breathing ${idleDuration} ease-in-out infinite` };
    case 'sway':
      return { animation: `vscroll-sway ${idleDuration} ease-in-out infinite` };
    default:
      return {};
  }
}

export function computeElementAnimationStyles(
  animConfig: LayerAnimationConfig,
  stage: 'initial' | 'entered' | 'exited'
): React.CSSProperties {
  return {
    ...computeEntryExitStyles(animConfig, stage),
    ...computeIdleAnimationStyle(animConfig, stage)
  };
}
