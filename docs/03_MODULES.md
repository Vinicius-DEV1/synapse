# Módulos do Sistema (Caderno)

O aplicativo Caderno é construído com uma abordagem modular. Cada módulo opera de forma relativamente independente em termos de lógica de negócio e criptografia, mas compartilha a infraestrutura core (banco de dados, engine de sync e interface principal).

## 1. Vault (Cofre)
Armazena senhas, emails e credenciais bancárias do usuário de forma inviolável.
- **Camada de Criptografia Extra:** Além da master key, requer um hashing adicional.
- Possui gerador de senhas e integração com API HIBP (Have I Been Pwned).

## 2. Notas (Caderno Principal)
Editor rico para texto livre.
- Suporta renderização de Tiptap / Prosemirror.
- Lida com metadados e blocos.

## 3. Biblioteca (Library)
Gerencia livros digitais (EPUB, PDF, imagens).
- Processa grandes arquivos localmente.
- O progresso de leitura é sincronizado via SQLite / IndexedDB.

## 4. Cultura & Vídeos
Gestor de mídias para séries, filmes e documentários.
- Usa `ffmpeg` (Rust) para processamento em backend.
- Exibe legendas sobrepostas.
- Executa vídeos a partir do Google Drive por intermédio de streaming criptografado no Tauri.

## 5. Anki (Estudos Espaçados)
Algoritmo FSRS embutido.
- Permite revisão iterativa.
- IA Gemini incorporada para chat focado em otimização do baralho.

## 6. Prática (Practice)
Treino de idiomas avançado.
- Conversação com a Gemini AI em formato de chat/fala.
- Retenção de Memória Core (a IA aprende com o usuário permanentemente extraindo fatos).

## 7. Focus (Lofi e Alarmes)
Ferramentas de produtividade e música ambiente (Lofi).
- Sincroniza estado da janela com alarmes cronometrados.

## 8. Arquivos (Drive Nativo)
Permite upload genérico.
- Semelhante a uma interface de cloud drive privada, mas com os dados criptografados com a chave pessoal do usuário.

## 9. Finanças
Tabela e dashboards financeiros simples para controle de despesas.
