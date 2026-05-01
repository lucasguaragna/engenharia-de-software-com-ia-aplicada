import Fastify from "fastify";
import { buildGraph } from "./graph/graph.ts";
import { HumanMessage } from "langchain";

// 1. O Gerente constrói a Esteira de Produção uma única vez quando o app liga
const graph = buildGraph();

export const createServer = () => {
    // 2. Instanciamos o Fastify (O Garçom)
    const app = Fastify({ logger: false });

    // 3. Criamos a rota para receber clientes
    app.post('/chat', {
        // Validação de entrada: Exige um JSON com a propriedade 'question'
        schema: {
            body: {
                type: 'object',
                required: ['question'],
                properties:  {
                    question: { type: 'string', minLength: 5}
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { question } = request.body as { question: string };
            
            // 4. A INTEGRAÇÃO COM O GRAFO ACONTECE AQUI
            // O .invoke é o botão de "Ligar" a esteira. Nós entregamos a ele
            // a nossa Mochila inicial (GraphState) contendo a pergunta do usuário.
            // Repare que empacotamos o texto do usuário na classe `HumanMessage`.
            const response = await graph.invoke({
                messages: [new HumanMessage(question)]
            });

            // 5. O código pausa (await) até a esteira terminar todo o fluxo.
            // Quando termina, o response é a Mochila final. Pegamos só o 'output' dela.
            return reply.send(response.output);
            
        } catch (error) {
            console.error('Error handling /chat request:', error);
            return reply.code(500).send({ error: "Erro interno no servidor." });
        }
    });

    return app;
}
