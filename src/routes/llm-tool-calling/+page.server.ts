import { codeToHtml } from 'shiki';
import type { PageServerLoad } from './$types';

export const prerender = true;

const PY_FULL = `from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1")  # vLLM, Ollama, llama.cpp, ...

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather for a city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"},
                "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["city"],
        },
    },
}]

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's the weather in Paris?"},
]

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",  # or Qwen/Qwen3-8B, same payload
    messages=messages,
    tools=tools,
)

call = response.choices[0].message.tool_calls[0]

messages += [
    response.choices[0].message,  # the tool call, appended back verbatim
    {
        "role": "tool",
        "tool_call_id": call.id,
        "content": get_weather(**json.loads(call.function.arguments)),
    },
]

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=messages,
    tools=tools,
)`;

export const load: PageServerLoad = async () => {
	const hl = (code: string, lang: string) => codeToHtml(code, { lang, theme: 'github-dark' });
	return {
		pyFull: await hl(PY_FULL, 'python')
	};
};
