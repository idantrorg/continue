import { ChatMessage as AICoreChatMessage, ChatMessages as AICoreChatMessages, ChatCompletionTool, MessageToolCall, MessageToolCalls, OrchestrationClient, OrchestrationModuleConfig, OrchestrationStream, Prompt, TextContent, ToolCallChunk } from "@sap-ai-sdk/orchestration";
import fs from "fs";
import os from "os";
import path from "path";
import { ChatMessage, CompletionOptions, LLMOptions, MessageContent, Tool, ToolCallDelta } from "../../index.js";
import { BaseLLM } from "../index.js";
import { registerDestination } from '@sap-cloud-sdk/connectivity';
import { devspace } from "@sap/bas-sdk";

const AI_CORE_CREDS_FILENAME = "ai-core-creds.json";
const CAP_MESSAGE = `
    <CREATE_CAP_APPLICATION_SYSTEM_PROMPT> 
        You are an AI assistant specialized in creating SAP Cloud Application Programming Model (CAP) applications. Your task is to guide the user through the process of creating and setting up a CAP application, following specific guidelines and using various tools. Here are your instructions:

        1. When the user provides their requirements to create CAP application, start by creating a comprehensive application summary. This summary should include:

        Application_summary:
        - A high-level description of the application's purpose and main features
        - A simplified storyboard-style diagram showing key entities and their relationships
        - Example data models defining main entities and how data is structured and accessed
        - Recommended technology stack (Node.js with CAP, SAP Fiori/UI5 or suitable low-code alternatives, database)
        - Project architecture outline (folder structure, main modules, and interactions)
       

        Keep the explanation concise, clear, and focused on system design. Do not generate implementation code or file scaffolding. Do not include a summary or closing paragraph.

        2. Present this application summary to the user.

        3. Ask for the user approval before proceeding. If the user doesn't approve, ask for clarification on what needs to be changed and adjust the summary accordingly.
        
        4. Once the user approves the summary, proceed with the following steps:
            a. Inform the user that you'll be create a CAP application
            b. Use CAP MCP Server tools to create the application.
            d. When calling the CAP MCP Server tools, include both:
                - The original user prompt
                - The 'Example data models' information from the approved application summary
            e. After the CAP MCP Server tools execute successfully:
                - Inform the user that their application has been created successfully
                - Ask if they need help with anything else
                - Do not double-check or verify if the application was created successfully - trust that the CAP MCP Server tools completed the task as intended.
        Your final response should only include the application summary.
    </CREATE_CAP_APPLICATION_SYSTEM_PROMPT>

    <CREATE_FIORI_UI_SYSTEM_PROMPT>
        You are an AI assistant specialized in creating SAP Fiori UI to CAP Application:
        1. Create Fiori UI, when user ask.
        2. Use the Fiori MCP tools to create the fiori UI .
        3. After the Fiori MCP Server tools execute successfully:
            - Inform the user that the UI has been created successfully
            - Ask if they need help with anything else
            - Do not double-check or verify if the UI was created successfully - trust that the Fiori MCP Server tools completed the task as intended.
        4. When completing creation of the application components do not provide more information on the created components and do not provide information on how to run it. 
        5. On any follow-up request to change or modify the UI of the full stack application, always try first to make the change by modifying only the app/annotations.cds file. 
    </CREATE_FIORI_UI_SYSTEM_PROMPT>

    <PUBLISH_APPLICATION_TO_GIT_HUB_FLOW>
        You are an AI assistant tasked with helping a user publish their application to GitHub. Follow these steps carefully, using the provided GitHub and Git MCPs (Managed Command Palettes) for all GitHub and Git actions respectively, unless otherwise specified.
        General instractions for github flow:
            -  gitignore already exist do not create new one.
            
        1. First, collect the necessary information from the user:

        <user_info>
        Please provide the following information:
        - GitHub username: {{USER_NAME}}
        - User email: {{USER_EMAIL}}
        - GitHub token: {{GITHUB_TOKEN}}
        </user_info>

        2.
        - Edit the /home/user/.continue/config.yaml file to add a GitHub token configuration.
        - Use the edit_existing_file tool
        - Do not provide additional explanations - execute the edit directly
        - IMPORTANT: preserve all existing entries do not remove existing value
        <edit_config>
        Add the following entry to the existing mcpServers section (preserve all existing entries):
        - name: GitHub
            command: node
            args:
            - "/local/github-mcp-server/build/index.js"
            env:
            GITHUB_TOKEN: {{GITHUB_TOKEN}}
        </edit_config>
        Important: 
         - Append only - do not overwrite existing mcpServers entries

        3. Set up the application directory as the git work directory:

        <set_work_dir>
        Set the current working directory to:
            path:{{APPLICATION_DIRECTORY}}
            validateGitRepo: false
            initializeIfNotPresent: true
        </set_work_dir>

        4. Ask the user for the name of the repository:

        <repo_name>
        Please provide a name for your GitHub repository (press Enter for the default name "{{REPO_NAME}}"):
        </repo_name>

        5. Create a GitHub repository using the GitHub MCP:

        <create_repo>
        Use the GitHub MCP to create a new repository with the name provided (or the default name if no input was given).
        </create_repo>

        6. Initialize the git repository and configure user information:

        <git_init>
        First cd the application folder.
        Then use the Git MCP to perform the following actions:
        - Initialize a new git repository
        - Configure the user name as: {{USER_NAME}}
        - Configure the user email as: {{USER_EMAIL}}
        </git_init>
        
        7. remote the repo to the github repository that we just created
        <git_remote>
            https://{USER_NAME}:{GITHUB_TOKEN}@github.com/username/{REPO_NAME}.git
        </git_remote>
        
        8. Add, commit, and push all the files.


        9. After completing all the above steps, provide the final output in two sections:

        <output>
            To set up the project locally, run the following commands or send them to the AI agent:
                - git clone https://github.com/{{USER_NAME}}/{{REPO_NAME}}.git
                - cd {{REPO_NAME}}
                - npm install
                - npm run start
        </output>

        Your final response should only include the content within the <output> tags. Do not include any of the previous steps or explanations in your final output.
    <PUBLISH_APPLICATION_TO_GIT_HUB_FLOW>

      `
export class AICore extends BaseLLM {
    static providerName = "aiCore";
    private llmOptions: LLMOptions;
    static defaultOptions: Partial<LLMOptions> = {
        model: "anthropic--claude-3.7-sonnet",
        contextLength: 200_000,
        completionOptions: {
            model: "anthropic--claude-3.7-sonnet",
            maxTokens: 8192,
        },
    };
    // Cache to indicate whether destination for LLM proxy has been registered
    private destinationBASLLMPromise;

    constructor(options: LLMOptions) {
        super(options);
        this.llmOptions = options;

        if (devspace.isBuild()) {
            this.destinationBASLLMPromise = registerDestination(
                { name: 'bas-llm', url: `${process.env["H2O_URL"]}/llm/v2` },
            );
        }
        // Only in Non BAS enviornments it may be possible to search for local json file. Otherwise it uses the BAS LLM Proxy.
        // Used for local development or testing purposes but do not fail if it doesn't exist.
        else if (!process.env["H2O_URL"]) {
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

        // Inject system prompt message
        if (messages.length > 1) {
            const content = messages[0].content;
            messages[0].content = `<BASIC_INSTRUCTIONS> ${content} </BASIC_INSTRUCTIONS> ${CAP_MESSAGE}`;
        }

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

        // Chat Completion

        // Relevant docs:
        // https://sap.github.io/ai-sdk/docs/js/orchestration/chat-completion#custom-destination
        // https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations#register-destination 
        const orchestrationClient = new OrchestrationClient(config, undefined, {
            destinationName: 'bas-llm'
        });

        let response;
        try {
            response = await orchestrationClient.chatCompletion(aiCorePrompt);
        }
        catch (e) {
            throw e;
        }

        const toolsCallsAiCore = response.getToolCalls();
        const toolCalls: ToolCallDelta[] = (!toolsCallsAiCore) ? [] : this.parseToolsResponce(toolsCallsAiCore);

        const content = response.getContent();
        if (content) {
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: content,
                toolCalls: []
            };
            yield assistantMessage;
        }

        if (toolCalls?.length > 0) {
            // Yield the assistant message with tool calls
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: "",
                toolCalls: toolCalls
            };
            yield assistantMessage;
        }

        // Streaming - opened issue as it stream doesn't work with tool calling on certain models (claude): https://github.com/SAP/ai-sdk-js/issues/942 
        // try {
        //     let response = await orchestrationClient.stream(aiCorePrompt)
        //     for await (const chunk of response.stream) {
        //         const content = chunk.getDeltaContent();
        //         const deltaToolCalls = chunk.getDeltaToolCalls();
        //         console.log(deltaToolCalls);
        //         if (content) {
        //             const assistantMessage: ChatMessage = {
        //                 role: "assistant",
        //                 content: content,
        //                 toolCalls: []
        //             };
        //             yield assistantMessage;
        //         }
        //     }
        //     const toolsCallsAiCore = response.getToolCalls();
        //     if (toolsCallsAiCore && toolsCallsAiCore.length > 0) {
        //         const toolCalls: ToolCallDelta[] = this.parseToolsResponce(toolsCallsAiCore)
        //         const assistantMessage: ChatMessage = {
        //             role: "assistant",
        //             content: "",
        //             toolCalls: toolCalls
        //         };
        //         yield assistantMessage;
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

/**
 * Adheres to the AI Core tool name requirements:
 * https://github.com/SAP/ai-sdk-js/blob/main/packages/orchestration/src/client/api/schema/function-object.ts#L15-L20
 * @param name 
 * @returns 
 * @returns 
 */
export function sanitizeToolName(name: string): string {
    // Replace any character not in [a-zA-Z0-9-_] with "-"
    let sanitized = name.replace(/[^a-zA-Z0-9-_]/g, "-");
    // Remove duplicate dashes/underscores, and trim
    sanitized = sanitized.replace(/[-_]{2,}/g, "-");
    // Remove starting/trailing dashes/underscores
    sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, "");
    // Ensure max length 64
    if (sanitized.length > 64) {
        sanitized = sanitized.substring(0, 64);
    }
    // Fallback if empty 
    if (sanitized.length === 0) sanitized = "tool";
    return sanitized;
}