// Importing LangChain Modules
import {
  StateGraph,
  START,
  END,
  MessagesZodMeta,
} from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from '@langchain/core/messages';

//Importing Nodes
import { createSchedulerNode } from './nodes/schedulerNode.ts';
import { createCancellerNode } from './nodes/cancellerNode.ts';
import { createIdentifyIntentNode} from "./nodes/identifyIntentNode.ts";
import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";

// Importing Zod: TypeScript-first validation library
import { z } from "zod/v3";

//Importing Services
import { openRouterService } from "../services/openRouterService.ts";
import { AppointmentService } from "../services/appointmentService.ts";

// Defining the data format of AppontmentStateAnnotation with Zod
const AppointmentStateAnnotation = z.object({
  messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),

  patientName: z.string().optional(),

  intent: z.enum(['schedule', 'cancel', 'unknown']).optional(),
  professionalId: z.number().optional(),
  professionalName: z.string().optional(),
  datetime: z.string().optional(),
  reason: z.string().optional(),

  actionSuccess: z.boolean().optional(),
  actionError: z.string().optional(),
  appointmentData: z.any().optional(),

  error: z.string().optional(),
});

export type GraphState = z.infer<typeof AppointmentStateAnnotation>;

export function buildAppointmentGraph(
  llmClient: openRouterService, 
  AppointmentService: AppointmentService
) {

  // Build workflow graph
  const workflow = new StateGraph({
    stateSchema: AppointmentStateAnnotation,
  })
    .addNode('identifyIntent', createIdentifyIntentNode(llmClient))
    .addNode('schedule', createSchedulerNode(AppointmentService))
    .addNode('cancel', createCancellerNode(AppointmentService))
    .addNode('message', createMessageGeneratorNode(llmClient))

    // Flow
    .addEdge(START, 'identifyIntent')

    // Route based on intent
    .addConditionalEdges(
      'identifyIntent',
      (state: GraphState): string => {
        if (state.error || !state.intent || state.intent === 'unknown') {
          return 'message';
        }

        console.log(`➡️  Routing based on intent: ${state.intent}`);
        return state.intent
      },
      {
        schedule: 'schedule',
        cancel: 'cancel',
        message: 'message',
      }
    )

    .addEdge('schedule', 'message')
    .addEdge('cancel', 'message')
    .addEdge('message', END);

  return workflow.compile();
}
