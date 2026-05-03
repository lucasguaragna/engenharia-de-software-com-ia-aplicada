import { getSystemPrompt, getUserPromptTemplate, MessageSchema } from '../../prompts/v1/messageGenerator.ts';
import { professionals } from '../../services/appointmentService.ts';
import { openRouterService } from '../../services/openRouterService.ts';
import type { GraphState } from '../graph.ts';
import { AIMessage } from 'langchain';

export function createMessageGeneratorNode(llmClient: openRouterService) {
    return async (state: GraphState): Promise<GraphState> => {
    
        try {
            console.log(`💬 Generating response message...`);
            const hasSucceeded = state.actionSuccess ? 'success': 'error';
            const scenario = `${state.intent ?? 'unknown'}_${hasSucceeded}`;
            const details = {
                professionalName: state.professionalName,
                datetime: state.datetime,
                patientName: state.patientName,
                error: state.error
            }

            const systemPrompt = getSystemPrompt();
            const userPrompt = getUserPromptTemplate( {scenario, details})

            const result = await llmClient.generateStructured(
                systemPrompt,
                userPrompt,
                MessageSchema,
            )
            console.log(`✅ Message Generated: `, result.data?.message ?? result.data ?? result)

            if (result.error) {
                console.log(`⚠️ Message Generation Failed: `, result.error);
                return {
                messages: [
                    ...state.messages,
                    new AIMessage("Desculpe, errei!")
                    ],
                };
            }
            return {
                messages: [
                    ...state.messages,
                    new AIMessage(result.data!.message)
                ],
            };
        } catch (error) {
            console.error('❌ Error in messageGenerator node:', error);
            return {
                messages: [
                    ...state.messages,
                    new AIMessage('An error occurred while processing your request.')
                ],
            };
        }
    };
}
