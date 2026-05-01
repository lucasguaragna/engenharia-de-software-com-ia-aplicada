import { buildGraph } from "./graph.ts";

// O LangGraph Studio (Interface Visual) precisa de uma função que retorne o grafo
// Ele vai chamar essa função sempre que a gente rodar o Studio.
export const graph = () => {
    return buildGraph();
}
