.pragma library

var defaultSampleQuestions = [
    {
        "id": "sample-1",
        "prompt": "Qual o modo de operação de cifra de bloco recomendado no Synapse para garantir confidencialidade e autenticidade (AEAD) nos arquivos de vídeo e banco de dados?",
        "options": [
            "AES-256-CBC com PKCS#7 padding",
            "AES-256-GCM com autenticação em Galois Field GF(2^128)",
            "AES-128-ECB determinístico",
            "DES clássico com chave tripla"
        ],
        "correctIndex": 1,
        "explanation": "O padrão de projeto criptográfico adotado pelo Caderno / Synapse estabelece estritamente o uso de AES-256-GCM (Galois/Counter Mode). Ele oferece criptografia autenticada (AEAD), detectando qualquer adulteração ou corrupção de bytes em tempo de execução."
    },
    {
        "id": "sample-2",
        "prompt": "Qual a principal vantagem do algoritmo FSRS v5 (Free Spaced Repetition Scheduler) sobre o algoritmo legado SM-2 do Anki?",
        "options": [
            "O FSRS modela a memória humana em dois componentes contínuos: Estabilidade (S) e Dificuldade (D), otimizando intervalos com regressão estatística real.",
            "O FSRS apenas dobra os dias a cada resposta correta, reduzindo a complexidade de cálculo.",
            "O FSRS não permite a avaliação 'Errei' quando o cartão é maduro.",
            "O FSRS necessita de conexão com a internet para calcular novos intervalos."
        ],
        "correctIndex": 0,
        "explanation": "Diferente do SM-2 heurístico de 1987, o FSRS v5 é baseado no modelo de 3 variáveis da memória (Retrievability, Stability, Difficulty) proposto por Piotr Wozniak e expandido com otimização estocástica, proporcionando retenção de 90% com ~30% menos revisões."
    },
    {
        "id": "sample-3",
        "prompt": "Em arquiteturas de alto desempenho que combinam Qt 6 QML com um motor central em Rust, qual mecanismo garante interoperabilidade com overhead de chamada zero e menor latência?",
        "options": [
            "Chamadas HTTP REST locais via porta TCP loopback 127.0.0.1",
            "Serialização e desserialização constante de strings JSON através de pipes stdin/stdout",
            "Ponte nativa C-ABI direta (extern \"C\") ligando funções C++ exportadas sem overhead de marshaling",
            "Banco de dados intermediário gravado em arquivo a cada evento"
        ],
        "correctIndex": 2,
        "explanation": "A ponte C-ABI (C Application Binary Interface) compila para código de máquina nativo e permite chamadas diretas de ponteiro de função em nanosegundos (zero-copy), eliminando latências de socket e parsing de strings que prejudicariam a fluidez a 60 FPS."
    }
];
