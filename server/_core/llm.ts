import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") return { type: "text", text: part };
  if (part.type === "text") return part;
  if (part.type === "image_url") return part;
  if (part.type === "file_url") return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }

  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;

  if (toolChoice === "required") {
    if (!tools || tools.length === 0)
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    if (tools.length > 1)
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    return { type: "function", function: { name: tools[0].function.name } };
  }

  if ("name" in toolChoice) return { type: "function", function: { name: toolChoice.name } };
  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema)
      throw new Error("responseFormat json_schema requires a defined schema object");
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) throw new Error("outputSchema requires both name and schema");

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ---------------------------------------------------------------------------
// Anthropic native API — converts the OpenAI-style payload to Anthropic format
// and returns an OpenAI-compatible InvokeResult so callers need no changes.
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "claude-sonnet-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/** Convert an OpenAI-style message array to Anthropic's system + messages format */
function toAnthropicMessages(messages: Message[]): {
  system: string | undefined;
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
} {
  const systemParts: string[] = [];
  const result: Array<{ role: "user" | "assistant"; content: unknown }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const parts = ensureArray(msg.content);
      systemParts.push(
        parts.map(p => (typeof p === "string" ? p : (p as TextContent).text ?? "")).join("\n")
      );
      continue;
    }

    const role = msg.role === "assistant" ? "assistant" : "user";
    const parts = ensureArray(msg.content);

    // Collapse to plain string when possible
    if (parts.length === 1 && typeof parts[0] === "string") {
      result.push({ role, content: parts[0] });
      continue;
    }
    if (parts.length === 1 && (parts[0] as TextContent).type === "text") {
      result.push({ role, content: (parts[0] as TextContent).text });
      continue;
    }

    // Multi-part: map to Anthropic content blocks
    const content = parts.map(p => {
      if (typeof p === "string") return { type: "text", text: p };
      if ((p as TextContent).type === "text") return { type: "text", text: (p as TextContent).text };
      if ((p as ImageContent).type === "image_url") {
        return {
          type: "image",
          source: { type: "url", url: (p as ImageContent).image_url.url },
        };
      }
      return { type: "text", text: JSON.stringify(p) };
    });
    result.push({ role, content });
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n") : undefined,
    messages: result,
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    maxTokens,
    max_tokens,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const payload: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    max_tokens: maxTokens ?? max_tokens ?? 8192,
    messages: anthropicMessages,
  };

  if (system) payload.system = system;

  // Tools
  if (tools && tools.length > 0) {
    payload.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters ?? { type: "object", properties: {} },
    }));

    const tc = normalizeToolChoice(toolChoice || tool_choice, tools);
    if (tc) {
      if (tc === "none") payload.tool_choice = { type: "none" };
      else if (tc === "auto") payload.tool_choice = { type: "auto" };
      else payload.tool_choice = { type: "tool", name: (tc as ToolChoiceExplicit).function.name };
    }
  }

  // Structured output via JSON schema — use a system prompt injection since
  // Anthropic does not have a native response_format field.
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat?.type === "json_schema") {
    const schemaStr = JSON.stringify(normalizedResponseFormat.json_schema.schema, null, 2);
    const instruction = `\n\nYou must respond with valid JSON that conforms to this schema:\n${schemaStr}\nRespond with JSON only — no markdown fences, no explanation.`;
    if (typeof payload.system === "string") {
      payload.system = (payload.system as string) + instruction;
    } else {
      payload.system = instruction.trim();
    }
  } else if (normalizedResponseFormat?.type === "json_object") {
    const instruction = "\n\nYou must respond with valid JSON only — no markdown fences, no explanation.";
    if (typeof payload.system === "string") {
      payload.system = (payload.system as string) + instruction;
    } else {
      payload.system = instruction.trim();
    }
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  // Map Anthropic response back to OpenAI-compatible InvokeResult
  const raw = (await response.json()) as {
    id: string;
    model: string;
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    stop_reason: string | null;
    usage: { input_tokens: number; output_tokens: number };
  };

  // Collect text blocks and tool-use blocks
  const textBlocks = raw.content.filter(b => b.type === "text");
  const toolBlocks = raw.content.filter(b => b.type === "tool_use");

  const messageContent: string =
    textBlocks.map(b => b.text ?? "").join("") || "";

  const toolCalls: ToolCall[] | undefined =
    toolBlocks.length > 0
      ? toolBlocks.map(b => ({
          id: b.id ?? "",
          type: "function" as const,
          function: {
            name: b.name ?? "",
            arguments: JSON.stringify(b.input ?? {}),
          },
        }))
      : undefined;

  return {
    id: raw.id,
    created: Math.floor(Date.now() / 1000),
    model: raw.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: messageContent,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: raw.stop_reason,
      },
    ],
    usage: {
      prompt_tokens: raw.usage.input_tokens,
      completion_tokens: raw.usage.output_tokens,
      total_tokens: raw.usage.input_tokens + raw.usage.output_tokens,
    },
  };
}
