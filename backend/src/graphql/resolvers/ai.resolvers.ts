import {GraphQLContext} from "../context";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {betaZodTool} from "@anthropic-ai/sdk/helpers/beta/zod";


const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AIResolvers = {
    Mutation: {
        askChatbot: async (_parent: any, { query }: any, context: GraphQLContext) => {


            const getWeatherTool = betaZodTool({
                name: "get_weather",
                description: "Get the current weather in a given location",
                inputSchema: z.object({
                    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
                    unit: z.enum(["celsius", "fahrenheit"]).default("fahrenheit").describe("Temperature unit")
                }),
                run: async (input) => {
                    return JSON.stringify({ temperature: "20°C"+input.unit, condition: "Sunny", location: input.location });
                }
            });

            const finalMessage = await client.beta.messages.toolRunner({
                model: "claude-opus-4-8",
                max_tokens: 1024,
                tools: [getWeatherTool],
                messages: [{ role: "user", content: "What's the weather like in Paris?" }]
            });

            for (const block of finalMessage.content) {
                if (block.type === "text") {
                    console.log(block.text);
                }
            }


            // const calculateSumTool = betaTool({
            //     name: "calculate_sum",
            //     description: "Add two numbers together",
            //     inputSchema: {
            //         type: "object",
            //         properties: {
            //             a: { type: "number", description: "First number" },
            //             b: { type: "number", description: "Second number" }
            //         },
            //         required: ["a", "b"]
            //     },
            //     run: async (input) => {
            //         return String(input.a + input.b);
            //     }
            // });
            //
            // const message = await client.messages.create({
            //     model: "claude-haiku-4-5",
            //     max_tokens: 1000,
            //     messages: [
            //         {
            //             role: "user",
            //             content: query
            //         }
            //     ]
            // });
            //
            // for (const block of message.content) {
            //     if (block.type === "text") {
            //         console.log(block.text);
            //     }
            // }
            //
            // return message.content.map(block => block.type === "text" ? block.text : "").join("\n");

        }
    },
}