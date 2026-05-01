import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "../src/server.ts"
import { type LLMResponse, OpenRouterService } from "../src/openRouterService.ts"
import { config } from "../src/config.ts"


console.assert(
    process.env.OPENROUTER_API_KEY,
    'OPENROUTER_API_KEY is not set in env variables'
)

test('Routes to cheapest models by default', async () => {
    const customConfig = {
        ...config,
        provider: {
            ...config.provider,
            sort: {
                ...config.provider.sort,
                by: 'price'
            }
        }
    }

    const routerService = new OpenRouterService(customConfig)
    const app = createServer(routerService)

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body: {question: 'Hello World!'},
    })

    const body = response.json() as LLMResponse

    assert.equal(body.model, 'openrouter/owl-alpha');
    //assert.equal(response.statusCode, 200)
})

test('Routes to the highest throughput by default', async () => {
    const customConfig = {
        ...config,
        provider: {
            ...config.provider,
            sort: {
                ...config.provider.sort,
                by: 'throughput'
            }
        }
    }

    const routerService = new OpenRouterService(customConfig)
    const app = createServer(routerService)

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body: {question: 'Hello World!'},
    })


    const body = response.json() as LLMResponse

    // assert.equal(response.statusCode, 200);
    assert.equal(body.model, 'openrouter/owl-alpha')
})