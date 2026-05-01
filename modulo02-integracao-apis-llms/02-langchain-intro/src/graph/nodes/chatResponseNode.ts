import { AIMessage } from "langchain";
import { type GraphState } from "../graph.ts";

// Departamento Final: O Empacotador de Mensagens
export function chatResponseNode(state: GraphState): GraphState {
    const responseText = state.output;
    
    // A mágica acontece aqui: Transformamos um texto bobo (string)
    // em um Objeto pesado de Mensagem de IA que o LangChain entende.
    // Nós estamos fingindo que foi uma IA que gerou essa resposta!
    const aiMessage = new AIMessage(responseText);

    return {
        ...state,
        // Adicionamos a nova mensagem gerada no final da lista de mensagens da mochila
        messages: [
            ...state.messages,
            aiMessage,
        ]
    };
}
