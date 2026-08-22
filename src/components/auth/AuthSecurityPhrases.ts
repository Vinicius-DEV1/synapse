export const INTIMIDATING_PHRASES = [
  'Se você usar toda a energia do sol para tentar quebrar essa criptografia AES-256 GCM, o sol vai apagar antes de você conseguir.',
  'O universo vai atingir o zero absoluto e congelar antes de você passar dessa tela. Vá tomar um café.',
  'Força bruta? Sério? Estamos no século 21. A criptografia ri da sua tentativa.',
  'Sua persistência é admirável, mas sua ignorância criptográfica é deplorável. Não vai rolar.',
  'Desista logo. Vá fazer algo mais produtivo do que tentar quebrar o inquebrável.',
];

export function getRandomIntimidatingPhrase(): string {
  return INTIMIDATING_PHRASES[Math.floor(Math.random() * INTIMIDATING_PHRASES.length)];
}
