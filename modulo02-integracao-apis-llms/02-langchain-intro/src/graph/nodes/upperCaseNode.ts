import { type GraphState } from "../graph.ts";

// Departamento: Transformador para Maiúsculo
export function upperCaseNode(state: GraphState): GraphState {
    // Pega o output (que a gente guardou lá no identifyIntent)
    // Transforma em maiúsculo e devolve a mochila atualizada
    return {
        ...state,
        output: state.output.toUpperCase()
    };
}
