import { config } from "./config.ts";
import { createServer } from "./server.ts";
import { OpenRouterService } from "./openRouterService.ts";

const routerService = new OpenRouterService(config);
const app  = createServer(routerService);

await app.listen({port: 3000, host: '0.0.0.0'});

// app.inject({
//     method: 'POST',
//     url: '/chat',
//     body: {question: 'What is TypeScript?'},
// }).then((response: { Status: any; body: any; }) => {
//     console.log('Response Status:', response.statusCode);
//     console.log('Response Body:', response.body)

// })