import confetti from 'canvas-confetti';

export const triggerFireworksAnimation = () => {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};

export const createDefaultQuestion = (idSuffix: number = 1) => ({
  id: `q_${Date.now()}_${idSuffix}`,
  type: 'multiple_choice' as const,
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  tags: [],
  selectedIndex: null,
  expectedAnswer: '',
  userTypedAnswer: '',
  aiFeedback: null,
  explanation: '',
  showExplanation: false,
  answered: false,
});
