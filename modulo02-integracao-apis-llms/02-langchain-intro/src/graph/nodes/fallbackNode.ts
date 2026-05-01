import { type GraphState } from "../graph.ts";

// Departamento: O "Plano B"
export function fallbackNode(state: GraphState): GraphState {
    return {
        ...state,
        output: "I don't know this command. Please use 'upper' or 'lower'."
    };
}
