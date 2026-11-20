package com.synapse.features.questions.data

val CURATED_MOBILE_QUESTIONS = listOf(
    MobileQuestion(
        id = "q1",
        prompt = "No protocolo Diffie-Hellman sobre curvas elípticas (ECDH), qual é a principal vantagem em relação ao Diffie-Hellman clássico baseado no problema do logaritmo discreto sobre corpos finitos?",
        options = listOf(
            "Permite chaves significativamente menores para o mesmo nível equivalente de segurança criptográfica.",
            "Dispensa completamente o uso de números primos grandes na geração dos parâmetros de domínio.",
            "Torna a troca de chaves imune a ataques por computadores quânticos através do algoritmo de Shor.",
            "Permite cifração direta de mensagens sem a necessidade de uma cifra simétrica auxiliar.",
        ),
        correctIndex = 0,
        explanation = "As curvas elípticas oferecem segurança equivalente com chaves muito menores (ex: chave ECC de 256 bits equivale a RSA de 3072 bits), reduzindo drasticamente consumo de banda e CPU.",
    ),
    MobileQuestion(
        id = "q2",
        prompt = "Qual modo de operação de cifra de bloco fornece simultaneamente confidencialidade e autenticação de integridade (AEAD) através da multiplicação em Galois Field GF(2^128)?",
        options = listOf(
            "CBC (Cipher Block Chaining)",
            "CTR (Counter Mode)",
            "GCM (Galois/Counter Mode)",
            "OFB (Output Feedback)",
        ),
        correctIndex = 2,
        explanation = "O AES-GCM combina o modo CTR para confidencialidade com o autenticador GMAC baseado em multiplicação polinomial em GF(2^128).",
    ),
    MobileQuestion(
        id = "q3",
        prompt = "No algoritmo FSRS v5 (Free Spaced Repetition Scheduler), quais são as três variáveis fundamentais de memória modeladas pelo DSR Model?",
        options = listOf(
            "Dificuldade (D), Estabilidade (S) e Retrievabilidade (R)",
            "Duração (D), Severidade (S) e Recorrência (R)",
            "Densidade (D), Separação (S) e Retenção (R)",
            "Divergência (D), Sensibilidade (S) e Repetição (R)",
        ),
        correctIndex = 0,
        explanation = "O FSRS v5 baseia-se no modelo DSR: D (Dificuldade do cartão), S (Estabilidade em dias) e R (Retrievabilidade percentual).",
    ),
)
