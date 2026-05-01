console.assert(
    process.env.OPENROUTER_API_KEY,
    'OPENROUTER_API_KEY is not set in env variables'
)

export type ModelConfig = {
    apiKey: string;
    httpReferer: string;
    xTitle: string;
    port: number;
    models: string[];
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    provider: {
        sort: {
            by: string,
            partition: string,
        }
    }
}

export const config: ModelConfig = {
    apiKey: process.env.OPENROUTER_API_KEY!,
    httpReferer: 'http://pos-ia.com',
    xTitle: 'SmartModeRouterGateway',
    port: 3000,
    models: [
        'openrouter/owl-alpha',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'poolside/laguna-xs.2:free'

    ],
    temperature: 0.2,
    maxTokens: 1000,
    systemPrompt: "You are a helpful assistant",
    provider: {
        sort: {
            by: 'price',
            partition: 'none',
        }
    }
}