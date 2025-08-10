import { ChatMessage as AICoreChatMessage, ChatMessages as AICoreChatMessages, ChatCompletionTool, MessageToolCall, MessageToolCalls, OrchestrationClient, OrchestrationModuleConfig, OrchestrationStream, Prompt, TextContent, ToolCallChunk } from "@sap-ai-sdk/orchestration";
import fs from "fs";
import os from "os";
import path from "path";
import { ChatMessage, CompletionOptions, LLMOptions, MessageContent, Tool, ToolCallDelta } from "../../../index.js";
import { BaseLLM } from "../../index.js";
import { sanitizeToolName } from "./AICoreUtils.js";
import { registerDestination } from '@sap-cloud-sdk/connectivity';
import { devspace } from "@sap/bas-sdk";

const AI_CORE_CREDS_FILENAME = "ai-core-creds.json"

export class AICoreGeneralProvider extends BaseLLM {
    static providerName = "aiCore";
    static defaultOptions: Partial<LLMOptions> = {
        model: "anthropic--claude-3.7-sonnet",
        contextLength: 128_000,
        completionOptions: {
            model: "anthropic--claude-3.7-sonnet",
            maxTokens: 4096,
        },
    };
    // Cache to indicate whether destination for LLM proxy has been registered
    private destinationBASLLMPromise;

    constructor(options: LLMOptions) {
        super(options);
        
        if (devspace.isBuild() ) {
            this.destinationBASLLMPromise = registerDestination(
                { name: 'bas-llm', url: `${process.env["H2O_URL"]}/llm/v2` },
            );
        }
        // Only in Non BAS enviornments it may be possible to search for local json file. Otherwise it uses the BAS LLM Proxy.
        // Used for local development or testing purposes but do not fail if it doesn't exist.
        else if (!process.env["H2O_URL"]){
            this.setupAiCore();
        }

    }

    private convertTools(tools?: Tool[]): ChatCompletionTool[] {
        if (!tools) {
            return []
        }
        return tools.map((tool) => {
            return {
                type: "function",
                function: {
                    "name": sanitizeToolName(tool.function.name),
                    "description": tool.function.description,
                    "parameters": tool.function.parameters,
                    "strict": tool.function.strict,
                }
            }

        })
    }
    private convertContentMessage(contents: MessageContent): string | TextContent[] {
        if (typeof contents === "string") {
            return contents;
        }
        return contents.filter((content) => content.type === "text").map((content) => {
            return {
                type: content.type,
                "text": content.text
            }
        })
    }
    private convertMessage(chatMessage: ChatMessage): AICoreChatMessage {
        const content = this.convertContentMessage(chatMessage.content)
        switch (chatMessage.role) {
            case "assistant":
                if (chatMessage.toolCalls) {
                    let toolCalls = this.convertToolCalls(chatMessage.toolCalls)
                    if (toolCalls.length >= 1) {
                        toolCalls = [toolCalls[0]];
                    }
                    return {
                        role: chatMessage.role,
                        content: "",
                        tool_calls: toolCalls
                    }
                }
                return {
                    role: chatMessage.role,
                    content: content,
                }
            case "tool":
                return {
                    role: "tool",
                    tool_call_id: chatMessage.toolCallId,
                    content: content,
                }
            case "system":
                return {
                    role: chatMessage.role,
                    content: content
                }
            case "user":
                return {
                    role: chatMessage.role,
                    content: content
                }

            case "thinking":
                return {
                    role: "system",
                    content: content
                }
        }

    }
    convertToolCalls(toolCalls: ToolCallDelta[]): MessageToolCalls {
        const messageToolCalls = toolCalls.map((toolCallDelta) => {
            const toolFunction = toolCallDelta.function;
            if (!toolCallDelta.id || !toolFunction || !toolFunction.arguments || !toolFunction.name) {
                return undefined
            }
            const messageToolCall: MessageToolCall = {
                type: "function",
                id: toolCallDelta.id,
                function: { name: toolFunction.name, arguments: toolFunction.arguments }

            }
            return messageToolCall
        }).filter((messageToolCall) => messageToolCall !== undefined)
        return messageToolCalls
    }

    private convertMessages(messages: ChatMessage[]): AICoreChatMessages {
        return messages.map((message) => this.convertMessage(message))
    }

    protected async *_streamComplete(
        prompt: string,
        signal: AbortSignal,
        options: CompletionOptions,
    ): AsyncGenerator<string> {
        const messages = [{ role: "user" as const, content: prompt }];
        for await (const update of this._streamChat(messages, signal, options)) {
            const content = update.content;
            if (Array.isArray(content)) {
                for (const chunk of content) {
                    if (chunk.type === "text") {
                        yield chunk.text;
                    }
                }
            }
            else {
                yield content
            }

        }
    }

    async *_streamChat(
        messages: ChatMessage[],
        signal: AbortSignal,
        options: CompletionOptions,
    ): AsyncGenerator<ChatMessage> {

        // Wait until the destination is registered.
        await this.destinationBASLLMPromise;
        const tools = this.convertTools(options.tools);
        const allAiCoreMessages = this.convertMessages(messages)
        const messagesHistory = allAiCoreMessages.slice(0, -1); // All items except last
        const aiCoreMessages = [allAiCoreMessages[allAiCoreMessages.length - 1]]; // Last item in array

        const aiCorePrompt: Prompt = {
            messages: aiCoreMessages,
            messagesHistory: messagesHistory
        }

        const config: OrchestrationModuleConfig = {
            llm: {
                model_name: options.model,
                model_params: {
                    max_tokens: options.maxTokens,
                }
            },
            templating: {
                tools: tools,
            }
        }


        // Relevant docs:
        // https://sap.github.io/ai-sdk/docs/js/orchestration/chat-completion#custom-destination
        // https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations#register-destination 
        const orchestrationClient = new OrchestrationClient(config, undefined, {
            destinationName: 'bas-llm'
        });

        // Chat Completion
        let response;
        try {
            response = await orchestrationClient.chatCompletion(aiCorePrompt);
        }
        catch (e) {
            throw e;
        }

        const toolsCallsAiCore = response.getToolCalls();
        const toolCalls: ToolCallDelta[] = (!toolsCallsAiCore) ? [] : this.parseToolsResponce(toolsCallsAiCore);

        const content = response.getContent() || "";

        // Yield the assistant message with tool calls
        const assistantMessage: ChatMessage = {
            role: "assistant",
            content: content,
            toolCalls: toolCalls
        };
        yield assistantMessage;

        // Streaming - enable this
        // try {

        //     let response = await orchestrationClient.stream(aiCorePrompt)
        //     for await (const chunk of response.stream) {
        //         const toolsCallsAiCore = chunk.getDeltaToolCalls();
        //         const toolCalls: ToolCallDelta[] = (!toolsCallsAiCore) ? [] : this.parseDeltaToolResponce(toolsCallsAiCore)
        //         const content = chunk.getDeltaContent() || ""
        //         if(!content && toolCalls.length === 0){
        //         }
        //         else{
        //             // Yield the assistant message with tool calls
        //             const assistantMessage: ChatMessage = {
        //                 role: "assistant",
        //                 content: content,
        //                 toolCalls: toolCalls
        //             };
        //             yield assistantMessage;
        //         }
        //     }
        // }
        // catch (e) {
        //     throw e;
        // }

    }
    parseDeltaToolResponce(toolsCallsAiCore: ToolCallChunk[]): ToolCallDelta[] {
        const tools = toolsCallsAiCore.map((tool) => {
            return {
                id: tool.id,
                type: tool.type,
                function: {
                    name: tool.function?.name,
                    arguments: tool.function?.arguments
                }
            };
        });
        if (!tools[0]) {
            return []
        }
        return [tools[0]]
    }

    parseToolsResponce(toolsCallsAiCore: MessageToolCalls): ToolCallDelta[] {
        return toolsCallsAiCore.map((tool) => {
            return {
                id: tool.id,
                type: tool.type,
                function: {
                    name: tool.function.name,
                    arguments: tool.function.arguments
                }
            };
        });
    }

    loadAiCoreCredentials(): string | undefined {
        const credsFilePath = path.join(os.homedir(), AI_CORE_CREDS_FILENAME);

        try {
            if (!fs.existsSync(credsFilePath)) {
                return undefined;
            }

            const fileContents = fs.readFileSync(credsFilePath, "utf-8");
            const parsed = JSON.parse(fileContents)

            // Check and report missing credentials
            const missingCredentials = []
            if (!parsed.clientid) {
                missingCredentials.push("clientid")
            }
            if (!parsed.clientsecret) {
                missingCredentials.push("clientsecret")
            }
            if (!parsed.url) {
                missingCredentials.push("url")
            }
            if (!parsed.serviceurls) {
                missingCredentials.push("serviceurls")
            } else if (!parsed.serviceurls.AI_API_URL) {
                missingCredentials.push("serviceurls.AI_API_URL")
            }

            if (missingCredentials.length > 0) {
                throw new Error(`Credentials file is missing required properties: ${missingCredentials.join(", ")}`)
            }

            return JSON.stringify(parsed)
        } catch (e) {
            throw new Error("Failed to parse AI Core credentials file:", e as any)
        }
    }

    setupAiCore(): void {
        let creds: string | undefined

        try {
            creds = this.loadAiCoreCredentials();
            process.env["AICORE_SERVICE_KEY"] = creds;
        } catch (err) {
            // Only log the error and proceed without setting the environment variable
            console.error(`Failed to load AI Core credentials: ${err}`);
        }

    }

}
