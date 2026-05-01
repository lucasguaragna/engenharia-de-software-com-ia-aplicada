import { OpenRouter } from "@openrouter/sdk";
import { config, type ModelConfig } from "./config.ts"
import { type ChatGenerationParams } from "@openrouter/sdk/models";

export type LLMResponse = {
    model: string,
    content: string,
}

export class OpenRouterService {
    private client: OpenRouter;
    private config: ModelConfig;

    constructor(configOverride?: ModelConfig) {
        this.config = configOverride ?? config;
        this.client = new OpenRouter ({
            apiKey: config.apiKey,
            httpReferer: config.httpReferer,
            xTitle: config.xTitle
        })
    }

    async generate(prompt: string, retriesLeft = 3): Promise<LLMResponse> {
        try {
            const response = await this.client.chat.send({
                models: this.config.models,
                messages: [
                    {role: 'system', content: this.config.systemPrompt},
                    {role: 'user', content: prompt}
                ],
                stream: false, // server generates the full response before sending it
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
                provider: this.config.provider as ChatGenerationParams['provider'],
            })

            return {
                model: response.model,
                content: String(response.choices.at(0)?.message?.content) ?? ''
            }

        } catch (error) {
            if (retriesLeft > 0) {
                console.log(`AI API failed. Retrying in 2 seconds... (${retriesLeft} retries left)`);
                // Pause code execution for 2 seconds (2000 milliseconds)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Call the function again (Recursion), decreasing the retry count
                return this.generate(prompt, retriesLeft - 1);
            } else {
                console.error("All retries failed. Giving up.");
                throw error; // Throw the error up so server.ts can return a 500 status code
            }
        } 
    }
}