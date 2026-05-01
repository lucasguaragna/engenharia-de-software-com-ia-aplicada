import { type GraphState } from "../graph.ts";

// Departamento 1: O "Classificador" (Ou Roteador)
// Este departamento recebe a mochila (state), analisa o que o usuário digitou,
// e preenche a etiqueta "command" da mochila.
export function identifyIntent(state: GraphState): GraphState {
    
    // 1. Pega a última mensagem que o usuário mandou no histórico
    // O .at(-1) é um atalho moderno do JS para pegar o último item de um array
    const lastMessage = state.messages.at(-1);
    
    // O conteúdo da mensagem no LangChain fica na propriedade .content
    const input = String(lastMessage?.content ?? "");
    const inputLower = input.toLowerCase();

    // 2. Por padrão, a intenção é desconhecida
    let command: GraphState['command'] = 'unknown';

    // 3. Regra de negócio boba: se a pessoa digitar "upper", muda a intenção
    if (inputLower.includes('upper')) {
        command = 'uppercase';
    } else if (inputLower.includes('lower')) {
        command = 'lowercase';
    }

    // 4. Retorna a mochila (...state copia tudo que estava lá)
    // Mas nós atualizamos o "command" com a decisão que tomamos
    // E copiamos o texto original para o "output" para os próximos departamentos usarem
    return {
        ...state,
        command: command,
        output: input
    };
}
