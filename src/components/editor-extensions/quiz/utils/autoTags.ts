export const generateAutoTags = (
  question: string,
  options?: string[],
  explanation?: string
): string[] => {
  const text = `${question} ${options?.join(' ') || ''} ${explanation || ''}`.toLowerCase();
  const knownKeywords: Record<string, string[]> = {
    javascript: ['javascript', 'js', 'node.js', 'typeof', 'console.log', 'es6', 'npm'],
    typescript: ['typescript', 'ts', 'interface', 'type ', 'generics'],
    react: ['react', 'usestate', 'useeffect', 'jsx', 'component', 'props'],
    python: ['python', 'def ', 'pip', 'list comprehension', 'pandas'],
    sql: ['sql', 'select', 'join', 'database', 'where', 'group by'],
    'html/css': ['html', 'css', 'flexbox', 'grid', 'div', 'style'],
    async: ['async', 'await', 'promise', 'callback', 'fetch', 'promisify'],
    funcoes: ['function', 'arrow function', 'parâmetro', 'retorno', 'scope'],
    estruturas: ['array', 'objeto', 'map', 'filter', 'reduce', 'json'],
    algoritmos: ['loop', 'for ', 'while', 'recursão', 'if ', 'else'],
  };

  const matched: string[] = [];
  Object.entries(knownKeywords).forEach(([tag, terms]) => {
    if (terms.some((term) => text.includes(term))) {
      matched.push(tag);
    }
  });

  return matched.length > 0 ? matched.slice(0, 3) : ['estudo'];
};
