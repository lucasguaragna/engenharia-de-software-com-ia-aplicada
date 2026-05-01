import { z } from 'zod';
import { BaseMessage } from 'langchain';
import { MessagesZodMeta, START, END, StateGraph } from '@langchain/langgraph';
import { withLangGraph } from '@langchain/langgraph/zod';

// Zod Schema: Define o formato exato da nossa "Mochila" (Estado)
export const GraphState = z.object({
    // Histórico de conversa. O withLangGraph é um truque para o LangGraph 
    // saber como "juntar" mensagens antigas com mensagens novas em vez 
    // de sobrescrevê-las
    //z.custom<TipoDoTypeScript>() é permitir passar um tipo custom diferente
    // de string, object, enum, etc.
    messages: withLangGraph(
        z.custom<BaseMessage[]>(),
        MessagesZodMeta
    ),
    // Texto de saída processado
    output: z.string(),
    // Intenção que o nosso agente vai identificar
    command: z.enum(['uppercase', 'lowercase', 'unknown'])
});

// Criação do tipo TypeScript automático a partir do Zod Schema
export type GraphState = z.infer<typeof GraphState>;

// Importando nossos Departamentos
import { identifyIntent } from './nodes/identifyIntentNode.ts';
import { upperCaseNode } from './nodes/upperCaseNode.ts';
import { lowerCaseNode } from './nodes/lowerCaseNode.ts';
import { fallbackNode } from './nodes/fallbackNode.ts';
import { chatResponseNode } from './nodes/chatResponseNode.ts';

// Função que constrói o nosso Grafo (A Esteira de Produção)
export function buildGraph() {
    
    // 1. Inicializa a máquina de estados vazia
    const workflow = new StateGraph({
        stateSchema: GraphState
    })
    
    // 2. Registra os Departamentos
    .addNode("identifyIntent", identifyIntent)
    .addNode("uppercase", upperCaseNode)
    .addNode("lowercase", lowerCaseNode)
    .addNode("fallback", fallbackNode)
    .addNode("chatResponse", chatResponseNode)

    // 3. Define a rota inicial
    .addEdge(START, "identifyIntent")

    // 4. Roteamento Condicional Inteligente
    .addConditionalEdges(
        "identifyIntent",
        (state: GraphState) => {
            switch(state.command) {
                case 'uppercase': return 'uppercase';
                case 'lowercase': return 'lowercase';
                default: return 'fallback';
            }
        },
        {
            'uppercase': 'uppercase',
            'lowercase': 'lowercase',
            'fallback': 'fallback',
        }
    )

    // 5. Após os operários, roteia todos para o empacotador
    .addEdge("uppercase", "chatResponse")
    .addEdge("lowercase", "chatResponse")
    .addEdge("fallback", "chatResponse")

    // 6. Fim do fluxo
    .addEdge("chatResponse", END);

    return workflow.compile();
}
