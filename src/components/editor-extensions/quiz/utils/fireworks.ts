import { triggerCelebrationConfetti } from '../../../../utils/confetti';

export const triggerFireworksAnimation = () => {
  triggerCelebrationConfetti({ durationMs: 2500, zIndex: 9999 });
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
  attemptsHistory: [],
});
