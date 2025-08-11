# How to Add a Model to AI Core LLM Provider

This guide explains how to add a new model to the AI Core LLM provider in the Continue project.

## Overview

To add a new model to the AI Core provider, you need to update four key files:

1. **Tool Support Configuration** - `core/llm/toolSupport.ts`
2. **UI Model Selection** - `gui/src/pages/AddNewModel/configs/models.ts`
3. **Provider Model Info** - `packages/llm-info/src/providers/AICore.bas.ts`
4. **Continue Configuration** - `~/.continue/config.json` or `~/.continue/config.yaml`

## Step-by-Step Instructions

### 1. Add Tool Support (if applicable)

If your model supports function calling/tools, add it to the AI Core section in `core/llm/toolSupport.ts`:

```typescript
aiCore: (model) => {
  if (
    [
      "anthropic--claude-3.7",
      "anthropic--claude-4-sonnet",
      "gpt-4o",
      "gpt-4.1",
      "your-new-model-name"  // Add your model here
    ].some((part) => model.toLowerCase().startsWith(part))
  ) {
    return true;
  }

  return false;
},
```

**Note**: Only add models that actually support function calling/tools. If your model doesn't support tools, skip this step.

### 2. Add Model to UI Selector

Add your model configuration to `gui/src/pages/AddNewModel/configs/models.ts`:

```typescript
export const models: { [key: string]: ModelPackage } = {
  // ... existing models ...
  
  yourNewModelKey: {
    title: "SAP AI Core Your Model Name",
    description: "Description of your model's capabilities and use cases",
    params: {
      model: "your-model-identifier",
      contextLength: 128_000,  // Adjust based on your model
      title: "Your Model Display Name",
      maxTokens: 4096,  // Adjust based on your model
      apiKey: "",
    },
    providerOptions: ["aiCore"],
    icon: "appropriate-icon.png",  // e.g., "openai.png", "anthropic.png"
    isOpenSource: false,  // Set to true if open source
  },
};
```

**Key Parameters**:
- `model`: The exact model identifier used by AI Core
- `contextLength`: Maximum context window size
- `maxTokens`: Maximum output tokens
- `title`: Display name in the UI
- `icon`: Icon file (use existing ones like "openai.png", "anthropic.png", etc.)
- `isOpenSource`: Boolean indicating if the model is open source

### 3. Add Model to Provider Info

Update `packages/llm-info/src/providers/AICore.bas.ts`:

```typescript
export const AICore: ModelProvider = {
    id: "aiCore",
    displayName: "SAP AI Core",
    models: [
        // ... existing models ...
        {
            model: "your-model-identifier",
            displayName: "Your Model Display Name",
            contextLength: 128000,
            maxCompletionTokens: 4096,
            recommendedFor: ["chat"],  // or ["code"], ["reasoning"], etc.
        },
    ],
};
```

**Parameters**:
- `model`: Must match the identifier used in step 2
- `displayName`: Human-readable name
- `contextLength`: Maximum context window
- `maxCompletionTokens`: Maximum output tokens
- `recommendedFor`: Array of use cases (e.g., "chat", "code", "reasoning")

### 4. Add to Continue Configuration

Add the model to your `.continue/config.json`:

```json
{
  "models": [
    {
      "model": "your-model-identifier",
      "provider": "aiCore",
      "title": "Your Model Display Name"
    }
  ]
}
```

## Example: Adding GPT-4.2

Here's a complete example of adding a hypothetical "GPT-4.2" model:

### 1. Tool Support (`core/llm/toolSupport.ts`)
```typescript
aiCore: (model) => {
  if (
    [
      "anthropic--claude-3.7",
      "anthropic--claude-4-sonnet",
      "gpt-4o",
      "gpt-4.1",
      "gpt-4.2"  // New model
    ].some((part) => model.toLowerCase().startsWith(part))
  ) {
    return true;
  }
  return false;
},
```

### 2. UI Selector (`gui/src/pages/AddNewModel/configs/models.ts`)
```typescript
gpt42AiCore: {
  title: "SAP AI Core GPT-4.2",
  description: "Latest GPT-4.2 model with enhanced reasoning capabilities",
  params: {
    model: "gpt-4.2",
    contextLength: 256_000,
    maxTokens: 8192,
    title: "GPT-4.2",
    providerOptions: ["aiCore"],
    systemMessage: "You are an expert software developer. You give helpful and concise responses.",
  },
  icon: "openai.png",
  isOpenSource: false,
},
```

### 3. Provider Info (`packages/llm-info/src/providers/AICore.bas.ts`)
```typescript
{
    model: "gpt-4.2",
    displayName: "GPT-4.2",
    contextLength: 256000,
    maxCompletionTokens: 8192,
    recommendedFor: ["chat", "code"],
},
```

### 4. Configuration (`.continue/config.json`)
```json
{
  "models": [
    {
      "model": "gpt-4.2",
      "provider": "aiCore",
      "title": "GPT-4.2"
    }
  ]
}
```

## Important Notes

1. **Model Identifiers**: Ensure the model identifier is consistent across all files
2. **Tool Support**: Only add models to `toolSupport.ts` if they actually support function calling
3. **Context Length**: Use accurate context window sizes for optimal performance
4. **Icons**: Reuse existing icons when appropriate (openai.png, anthropic.png, etc.)
5. **Testing**: Test the model configuration thoroughly before deploying

## Troubleshooting

- **Model not appearing in UI**: Check that the model is properly added to `models.ts` with correct `providerOptions: ["aiCore"]`
- **Tool calling not working**: Verify the model is added to `toolSupport.ts` and actually supports function calling
- **Configuration errors**: Ensure model identifiers match exactly across all files
- **Context length issues**: Verify the context length matches the actual model capabilities

## File Locations Summary

- **Tool Support**: `core/llm/toolSupport.ts`
- **UI Configuration**: `gui/src/pages/AddNewModel/configs/models.ts`
- **Provider Info**: `packages/llm-info/src/providers/AICore.bas.ts`
- **User Config**: `.continue/config.json`
