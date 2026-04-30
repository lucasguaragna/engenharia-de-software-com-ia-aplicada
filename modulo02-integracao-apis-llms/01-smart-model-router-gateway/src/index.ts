import { createServer } from "./server.ts";

const app  = createServer();

await app.listen({port: 3000, host: '0.0.0.0'});

app.inject({
    method: 'POST',
    url: '/chat',
    body: {question: 'Hello World!'},
}).then((response: { Status: any; body: any; }) => {
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', response.body)

})