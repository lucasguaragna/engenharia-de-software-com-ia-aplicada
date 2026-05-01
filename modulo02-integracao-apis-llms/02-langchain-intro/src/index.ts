import { createServer } from "./server.ts";

const app = createServer();

// Inicia o nosso servidor na porta 3000
await app.listen({ port: 3000, host: '0.0.0.0' });
console.log('🚀 Servidor LangGraph rodando!');
console.log('Para testar, abra outro terminal e rode:');
console.log(`curl localhost:3000/chat --data '{"question": "make this uppercase"}' -H "Content-type: application/json"`);
