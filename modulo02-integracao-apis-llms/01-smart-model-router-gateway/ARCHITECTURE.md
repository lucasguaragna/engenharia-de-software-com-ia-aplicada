# Arquitetura do Sistema: Smart Model Router Gateway

Este documento ilustra o fluxo de dados e os componentes do projeto de Gateway Inteligente construído no curso.

## Fluxo da Aplicação

O diagrama abaixo mostra como uma requisição (pergunta) sai do usuário, passa pelos nossos arquivos de código (o Garçom, o Cozinheiro e o Gerente), e chega nas APIs das Inteligências Artificiais.

```mermaid
graph TD
    %% Entidades Externas
    User([Usuário / Cliente HTTP])
    
    %% Nosso Servidor Node.js
    subgraph Nossa Aplicacao Node.js
        Server["🖥️ Fastify Server\n(server.ts)\n\nLida com rotas HTTP,\nvalida dados e retorna\ncódigos 200/500"]
        
        Service["🧠 OpenRouter Service\n(openRouterService.ts)\n\nA classe que encapsula o SDK,\ntem a regra de negócio e\no sistema de Retry"]
        
        Config["⚙️ Configurações\n(config.ts)\n\nValida a API Key, dita\nos modelos permitidos e a\nregra de preço"]
        
        SDK["📦 OpenRouter SDK\n(@openrouter/sdk)"]
    end

    %% O Mundo Exterior (APIs)
    subgraph Mundo Exterior
        OpenRouterCloud(("☁️ OpenRouter API"))
        Nvidia["Nvidia Models\n(nemotron)"]
        Poolside["Poolside Models\n(laguna)"]
        Outros["Outros Provedores"]
    end

    %% Relações de Fluxo
    User -->|Faz um POST /chat\ncom a question| Server
    Server -->|Chama routerService.generate| Service
    Service -.->|Lê as regras| Config
    Service -->|Usa o .chat.send| SDK
    
    SDK -->|Requisição via Internet| OpenRouterCloud
    
    OpenRouterCloud -.->|Roteamento pelo\nMenor Preço| Nvidia
    OpenRouterCloud -.->|Roteamento pelo\nMenor Preço| Poolside
    OpenRouterCloud -.->|Roteamento pelo\nMenor Preço| Outros

    %% Estilos (Opcional para ficar bonito)
    classDef file fill:#f9f2f4,stroke:#333,stroke-width:2px;
    class Server,Service,Config file;
```

## Como Ler Este Diagrama (Analogias)

1. **Usuário:** É o cliente sentando na mesa do restaurante.
2. **Fastify Server (`server.ts`):** É o **Garçom**. Ele recebe o pedido, anota, e se o pedido der errado, ele avisa o cliente com educação (Erro 500).
3. **OpenRouter Service (`openRouterService.ts`):** É o **Cozinheiro Chefe**. Ele não atende cliente. Ele só pega a comanda, aplica a inteligência (como o sistema de tentar de novo se o fogão falhar - Retries) e conversa com o fornecedor.
4. **Config (`config.ts`):** É o **Gerente**. Ele dita a regra máxima do restaurante: "Só vamos comprar ingredientes do fornecedor mais barato (`sort by price`)".
5. **OpenRouter API:** É o "Trivago" das IAs. Ele recebe o nosso pedido e manda dinamicamente para o provedor (Nvidia, Poolside, etc) que estiver cumprindo as regras do nosso Gerente no momento.
