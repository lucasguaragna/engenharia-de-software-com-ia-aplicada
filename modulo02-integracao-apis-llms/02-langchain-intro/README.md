# 🧠 LangChain e LangGraph: O "Hello World" de Agentes

Este projeto marca uma das transições mais importantes do nosso curso: a saída da arquitetura linear clássica para a **Arquitetura Baseada em Grafos (State Machines)**. 

Embora o programa pareça "bobo" (ele apenas converte texto para maiúsculo ou minúsculo), ele foi desenhado dessa forma para isolar a complexidade. O objetivo aqui é aprender como conectar os "canos" do LangGraph sem se preocupar com as dores de cabeça de uma chamada real para uma IA.

## 🏗️ Como a Arquitetura Funciona (A Esteira de Produção)

No LangGraph, nós deixamos de ter uma "Classe Gigante" que faz tudo e passamos a ter um **Fluxograma**.

1. **A Mochila (GraphState):** 
   Criamos um `State` protegido pela biblioteca Zod. Essa "mochila" viaja de mão em mão contendo o histórico de mensagens, o comando detectado e o texto processado.
   
2. **Os Departamentos (Nodes):** 
   São funções curtas e "puras". Elas pegam a mochila, atualizam uma única coisa (ex: passam o texto para maiúsculo) e devolvem a mochila.

3. **As Correias (Edges):**
   É o Roteador (`graph.ts`) que dita as regras do jogo. Ele decide que o passo A leva ao passo B, ou usa "Arestas Condicionais" (`addConditionalEdges`) para tomar decisões de trânsito baseadas no que está dentro da mochila.

## 📂 Organização dos Arquivos

Aqui está a anatomia exata de como dividimos a complexidade do código em arquivos menores e focados:

*   **`src/index.ts`**: O ponto de partida. Ele liga a chave do servidor Fastify para que ele fique escutando na porta 3000.
*   **`src/server.ts`**: O nosso "Garçom". Ele recebe o `POST /chat`, pega a mensagem do usuário, empacota ela como um `HumanMessage` e aperta o botão de ligar a esteira do Grafo (`graph.invoke`).
*   **`src/graph/graph.ts`**: O "Maestro" da arquitetura. É aqui que usamos o Zod para proteger o nosso Estado (`GraphState`), e onde nós instanciamos a Máquina de Estados e criamos as conexões (`addEdge` e `addConditionalEdges`).
*   **`src/graph/factory.ts`**: Um arquivo simples para expor a função `buildGraph()`, necessário apenas para fazer o painel visual do *LangGraph Studio* funcionar.
*   **`src/graph/nodes/`**: A pasta que guarda os nossos "Departamentos" (Funções Puras).
    *   `identifyIntentNode.ts`: Analisa o texto do usuário e etiqueta a intenção.
    *   `upperCaseNode.ts` / `lowerCaseNode.ts`: Transformam a string.
    *   `fallbackNode.ts`: Retorna uma mensagem de erro genérica.
    *   `chatResponseNode.ts`: Empacota a string processada em um objeto de resposta oficial do LangChain (`AIMessage`), fechando o ciclo.
*   **`langgraph.json`**: O mapa de configuração do LangChain. Diz ao LangGraph Studio onde encontrar o nosso arquivo `factory.ts`.

## 🗺️ Diagrama de Blocos (Mermaid)

O diagrama abaixo ilustra exatamente o código que construímos no arquivo `graph.ts`. 

*(Dica: No VS Code, instale a extensão "Markdown Preview Mermaid Support" e aperte `Cmd + Shift + V` para visualizar graficamente)*

```mermaid
graph TD
    User([Usuário (via Fastify /chat)]) -->|Envia 'question'| GraphStart((START))
    
    subgraph Máquina de Estados (LangGraph)
        GraphStart -->|Inicia o Fluxo| IdentifyIntent["🧠 identifyIntentNode\n(O Classificador)"]
        
        IdentifyIntent -->|Preenche a variável\n'command' na Mochila| Condicao{"Qual é\no comando?"}
        
        Condicao -->|'uppercase'| UpperCase["🔠 upperCaseNode\n(Operário Maiúsculo)"]
        Condicao -->|'lowercase'| LowerCase["🔡 lowerCaseNode\n(Operário Minúsculo)"]
        Condicao -->|'unknown'| Fallback["❓ fallbackNode\n(Plano B / Erro)"]
        
        UpperCase --> ChatResponse["📦 chatResponseNode\n(O Empacotador Final)"]
        LowerCase --> ChatResponse
        Fallback --> ChatResponse
        
        ChatResponse -->|Adiciona AIMessage\nno Histórico| GraphEnd((END))
    end
    
    GraphEnd -->|Fastify devolve\no response.output| User

    %% Estilos das caixinhas
    classDef operario fill:#d4edda,stroke:#28a745,stroke-width:2px;
    classDef classificador fill:#cce5ff,stroke:#007bff,stroke-width:2px;
    classDef fim fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    
    class IdentifyIntent classificador;
    class UpperCase,LowerCase operario;
    class ChatResponse fim;
```

## 🚀 Como Executar

Temos duas formas de rodar essa arquitetura:

### Modo 1: O Garçom Clássico (Terminal)
Inicia o servidor Fastify e aguarda comandos via HTTP puro.
```bash
npm run dev
# Em outro terminal:
curl localhost:3000/chat --data '{"question": "make this uppercase"}' -H "Content-type: application/json"
```

### Modo 2: LangGraph Studio (Visual)
Sobe a ferramenta gráfica do LangChain, onde você vê as caixinhas de nós acendendo em tempo real conforme a mensagem passa por elas.
```bash
npm run langgraph:serve
```

## 🔜 Próximos Passos (A Evolução)
Nos módulos futuros, o `upperCaseNode` deixará de ser uma função boba e passará a ser uma requisição real para IAs ou Banco de Dados, mas a **estrutura das caixinhas (Grafo)** continuará exatamente a mesma!
