# Sistema de Salvamento de Vocabulário (Ideias Futuras)

Este documento guarda as propostas discutidas para implementação futura de um sistema de salvamento de traduções e vocabulário inteligente a partir do Dicionário IA.

## O Problema a Resolver
Estudantes de idiomas frequentemente perdem o vocabulário valioso que pesquisam durante a leitura. O objetivo é permitir que, com um clique, a palavra pesquisada, sua tradução, pronúncia e o **contexto exato** da frase no livro sejam salvos para revisão posterior.

---

## Propostas de Implementação

### Opção A: O "Caderno de Vocabulário" (Módulo Dedicado) 🌟
**Foco:** Revisão estruturada e espaçada (estilo Anki/Quizlet).
* **Mecânica:** Um botão de "Estrela" (⭐ Salvar) no modal do Dicionário.
* **Banco de Dados:** Uma nova tabela (`vocabulary_cards`) guardando: `id`, `word`, `language`, `phonetic`, `definition`, `collocations`, `book_id`, `context_sentence`, `created_at`.
* **Interface:** Um novo módulo principal na barra lateral ("Vocabulário"). A tela exibe "Flashcards" modernos. Na frente do cartão, a palavra em inglês; ao interagir, ele revela a tradução, sinônimos e a frase original do livro para resgatar a memória.
* **Potencial Futuro:** Adicionar um sistema de "Revisão do Dia" (Spaced Repetition) para testar o usuário.

### Opção B: Anexar nas "Notas" (Integração Simples) 📝
**Foco:** Diário de palavras e liberdade de edição.
* **Mecânica:** Um botão "Enviar para Notas" (📝) no modal do dicionário.
* **Banco de Dados:** Utiliza o sistema atual de Páginas (`pages` e bloco Tiptap).
* **Interface:** O sistema cria ou busca uma página especial chamada "📚 Meu Vocabulário". Ao salvar, a IA formata a palavra e a explicação em Markdown ou blocos Tiptap e dá um *append* no final dessa nota. O usuário pode entrar na nota depois e grifar, apagar ou adicionar suas próprias anotações sobre a palavra.

### Opção C: Salvar como Grifo Inteligente (Direto no Livro) 🖍️
**Foco:** Aprendizado atrelado 100% à leitura contextual.
* **Mecânica:** Um botão "Fixar no Livro" dentro do Dicionário.
* **Banco de Dados:** Utiliza o sistema atual de Grifos (`highlights`).
* **Interface:** O aplicativo aplica um grifo automático na palavra pesquisada (ex: um grifo de cor diferente, como Roxo ou sublinhado). Todo o retorno do JSON da IA (pronúncia, significado, collocations) é injetado como texto na "Nota" do grifo. Quando o usuário reler a página no futuro, basta clicar na palavra destacada e o balão abrirá instantaneamente mostrando todo o ensinamento da IA.

---

**Nota Técnica:** Todas as opções podem se beneficiar de salvar também a referência do livro (`book_id` e CFI/posição) para que o usuário sempre saiba de qual obra literária ele extraiu aquela expressão.
