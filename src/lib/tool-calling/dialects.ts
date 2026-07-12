/**
 * `br: true` marks a line break we insert for display only — the raw stream
 * has no newline there. Byte-fidelity checks (verify_dialects.mjs) skip them.
 */
export type Segment = { text: string; tip?: string; br?: boolean };

export type SectionKind = 'system' | 'schema' | 'user' | 'reasoning' | 'call' | 'response';

export type Block = { kind: SectionKind; segments: Segment[] };

export const SECTION_META: Record<SectionKind, { label: string }> = {
	system: { label: 'system prompt' },
	schema: { label: 'tool schema' },
	user: { label: 'user message' },
	reasoning: { label: 'reasoning' },
	call: { label: 'tool call' },
	response: { label: 'tool response' }
};

export type Dialect = {
	key: string;
	label: string;
	models: string;
	blurb: string;
	/** true control tokens — dedicated vocabulary entries flagged special */
	specialTokens: string[];
	/** single vocabulary entries NOT flagged special (rendered with a dashed outline) */
	vocabTokens?: string[];
	blocks: Block[];
};

// Every dialect below is rendered from the SAME conversation — identical
// system prompt, user query, tool call, and tool response — through each
// model's real, unmodified chat template (tool-schema-research/render_convo.py).
// Whatever differs on the page is the template's doing, not ours.

export const dialects: Dialect[] = [
	{
		key: 'harmony',
		label: 'Harmony',
		models: 'gpt-oss-20b',
		blurb:
			'OpenAI built harmony from scratch, so every boundary here is a dedicated special token: <|channel|>, <|message|>, <|call|>. Reasoning is a message on the analysis channel, and the tool response is routed back with the same to= addressing the call used.',
		specialTokens: ['<|start|>', '<|message|>', '<|end|>', '<|channel|>', '<|call|>'],
		blocks: [
			{
				kind: 'system',
				segments: [
					{ text: '<|start|>system<|message|>' },
					{
						text: 'You are ChatGPT, a large language model trained by OpenAI.',
						tip: "We never wrote this. It is the template's default model_identity, and the docs say to change identity through the developer message instead."
					},
					{ text: '\nKnowledge cutoff: 2024-06\nCurrent date: 2026-07-06\n\n' },
					{
						text: 'Reasoning: medium',
						tip: "Comes from the template's reasoning_effort kwarg. Effort is written into the prompt as text, there is no sampling parameter for it."
					},
					{ text: '\n\n' },
					{
						text: "# Valid channels: analysis, commentary, final. Channel must be included for every message.\nCalls to these tools must go to the commentary channel: 'functions'.",
						tip: 'Only present because tools were passed. Without tools the system message never mentions channels.'
					},
					{ text: '\n', br: true },
					{ text: '<|end|>' },
					{ text: '\n', br: true },
					{ text: '<|start|>developer<|message|># Instructions\n\n' },
					{
						text: 'You are a helpful assistant.',
						tip: 'Our system prompt. harmony moves it into the developer role and keeps the system slot for identity and channel rules.'
					},
					{ text: '\n\n' }
				]
			},
			{
				kind: 'schema',
				segments: [
					{ text: '# Tools\n\n## functions\n\n' },
					{
						text: 'namespace functions {',
						tip: 'Tools live in a TypeScript style namespace. The call syntax to=functions.get_weather points into it.'
					},
					{ text: '\n\n' },
					{
						text: '// Get the current weather for a city.',
						tip: "The tool's `description` field, rendered as a code comment."
					},
					{
						text: '\ntype get_weather = (_: {\ncity: string,\nunits?: "celsius" | "fahrenheit",\n}) => any;',
						tip: 'The JSON Schema converted to a TypeScript signature. Optional params get ?, enums become unions.'
					},
					{ text: '\n\n} // namespace functions' },
					{ text: '\n', br: true },
					{
						text: '<|end|>',
						tip: 'Closes the developer turn. Instructions and tool schema share one message.'
					}
				]
			},
			{
				kind: 'user',
				segments: [
					{ text: "<|start|>user<|message|>What's the weather in Paris?" },
					{ text: '\n', br: true },
					{ text: '<|end|>' }
				]
			},
			{
				kind: 'reasoning',
				segments: [
					{ text: '<|start|>assistant' },
					{
						text: '<|channel|>analysis',
						tip: 'The chain of thought channel. Not trained to the same safety standard as final output, so it should not be shown to users.'
					},
					{ text: '<|message|>' },
					{
						text: 'User asks for the weather in Paris. We need to call the get_weather function.',
						tip: 'Reasoning is dropped from history on the next turn, unless a tool call is pending like here, in which case it is passed back in.'
					},
					{ text: '\n', br: true },
					{ text: '<|end|>' }
				]
			},
			{
				kind: 'call',
				segments: [
					{ text: '<|start|>assistant ' },
					{
						text: 'to=functions.get_weather',
						tip: 'to= sets the recipient. A tool call is a message addressed to the tool instead of the user.'
					},
					{
						text: '<|channel|>commentary json',
						tip: "The channel selector plus a content-type suffix. Tool calls are required to use the 'commentary' channel."
					},
					{ text: '<|message|>' },
					{
						text: '{"city": "Paris", "units": "celsius"}',
						tip: 'The template runs tojson on the arguments dict.'
					},
					{ text: '\n', br: true },
					{
						text: '<|call|>',
						tip: 'A separate stop token from <|end|>. Inference stops here and waits for the tool result.'
					}
				]
			},
			{
				kind: 'response',
				segments: [
					{
						text: '<|start|>functions.get_weather',
						tip: 'The sender is the function name itself, not a generic tool role.'
					},
					{
						text: ' to=assistant',
						tip: 'Routed back to the assistant, mirroring the to= on the call.'
					},
					{ text: '<|channel|>commentary<|message|>' },
					{
						text: '"{\\"temperature\\": 18, \\"condition\\": \\"cloudy\\"}"',
						tip: 'The template runs tojson on the content no matter what. We passed an already encoded JSON string, so it got double encoded.'
					},
					{ text: '\n', br: true },
					{ text: '<|end|>' }
				]
			}
		],
	},
	{
		key: 'qwen',
		label: 'Qwen',
		models: 'Qwen3-8B',
		blurb:
			'Qwen keeps its ChatML base and adds tool calling on top. Markers like <tool_call> and <think> are single tokens in the vocabulary but not marked special (hence the dashed outline), the call format is taught inside the system prompt, and the tool response is sent as another user turn.',
		specialTokens: ['<|im_start|>', '<|im_end|>'],
		vocabTokens: [
			'<tool_call>',
			'</tool_call>',
			'<tool_response>',
			'</tool_response>',
			'<think>',
			'</think>'
		],
		blocks: [
			{
				kind: 'system',
				segments: [
					{ text: '<|im_start|>system\n' },
					{
						text: 'You are a helpful assistant.',
						tip: 'Kept as is in the system role, unlike harmony which moves it to a developer turn.'
					},
					{
						text: '\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n',
						tip: 'The template appends this right after your instructions, inside the same system message. With no system prompt you still get a system turn holding just the Tools section.'
					}
				]
			},
			{
				kind: 'schema',
				segments: [
					{ text: '<tools>\n' },
					{
						text: '{"type": "function", "function": {"name": "get_weather", "description": "Get the current weather for a city.", "parameters": {"type": "object", "properties": {"city": {"type": "string"}, "units": {"type": "string", "enum": ["celsius", "fahrenheit"]}}, "required": ["city"]}}}',
						tip: 'The JSON Schema dumped as is with tojson. No conversion to a model specific syntax.'
					},
					{ text: '\n</tools>\n\n' }
				]
			},
			{
				kind: 'system',
				segments: [
					{
						text: 'For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{"name": <function-name>, "arguments": <args-json-object>}\n</tool_call>',
						tip: 'The call format is taught here with an example. Nothing enforces it, parsers rely on the model having learned it.'
					},
					{ text: '\n', br: true },
					{ text: '<|im_end|>\n' }
				]
			},
			{
				kind: 'user',
				segments: [
					{ text: "<|im_start|>user\nWhat's the weather in Paris?" },
					{ text: '\n', br: true },
					{ text: '<|im_end|>\n' }
				]
			},
			{
				kind: 'reasoning',
				segments: [
					{ text: '<|im_start|>assistant\n' },
					{
						text: '<think>',
						tip: 'Reasoning delimiters. Single vocabulary entries (ids 151667/151668), not marked special, same as the tool tags.'
					},
					{
						text: '\nUser asks for the weather in Paris. We need to call the get_weather function.\n'
					},
					{
						text: '</think>',
						tip: 'The template strips think blocks from older turns when re-rendering history. Reasoning survives only while a tool call is pending, same as harmony.'
					},
					{ text: '\n\n' }
				]
			},
			{
				kind: 'call',
				segments: [
					{
						text: '<tool_call>',
						tip: 'A single vocabulary entry (id 151657) with special: false, so stop and skip logic that only watches control tokens will not see it.'
					},
					{ text: '\n' },
					{
						text: '{"name": "get_weather", "arguments": {"city": "Paris", "units": "celsius"}}',
						tip: 'The template skips tojson when arguments is already a string, which avoids double escaping.'
					},
					{ text: '\n</tool_call>' },
					{ text: '\n', br: true },
					{ text: '<|im_end|>\n' }
				]
			},
			{
				kind: 'response',
				segments: [
					{
						text: '<|im_start|>user',
						tip: 'There is no tool role. A tool response is another user turn.'
					},
					{ text: '\n' },
					{
						text: '<tool_response>',
						tip: 'Only this plain-text wrapper distinguishes a tool result from something the human typed.'
					},
					{ text: '\n{"temperature": 18, "condition": "cloudy"}\n</tool_response>' },
					{ text: '\n', br: true },
					{ text: '<|im_end|>\n' }
				]
			}
		],
	}
];
