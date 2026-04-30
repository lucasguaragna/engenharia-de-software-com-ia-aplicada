import Fastify from "fastify";

export const createServer = () => {
    const app = Fastify({logger: false});

    app.post('/chat', {
        schema: {
            body: {
                type: 'object',
                required: ['question'],
                properties: {
                    question: {type: 'string', minLength: 5}
                }
            }
        }
    }, 

    async (request: { body: { question: string; }; }, reply: { send: (arg0: string) => any; code: (arg0: number) => any; }) => {
        try {
            const { question } = request.body as {question: string}
            return reply.send('hello!')
        } catch (err) {
            console.error('Error handling /chat requests', err);
            return reply.code(500);   
        }
    })

    return app
}