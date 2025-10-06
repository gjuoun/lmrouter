// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type { Stream } from "openai/core/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
} from "openai/resources/chat/completions";
import type { LMRouterApiCallUsage } from "../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../types/config.js";
import type {
  OpenAIChatCompletionAdapter,
  OpenAIChatCompletionInputOptions,
} from "./adapter.js";

export class OpenAIChatCompletionOpenAIAdapter
  implements OpenAIChatCompletionAdapter
{
  usage?: LMRouterApiCallUsage;

  getClient(provider: LMRouterConfigProvider): OpenAI {
    return new OpenAI({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      defaultHeaders: {
        "HTTP-Referer": "https://lmrouter.com/",
        "X-Title": "LMRouter",
      },
    });
  }

  private calculateUsage(
    service_tier: string | null | undefined,
    usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
        audio_tokens?: number;
      };
      completion_tokens_details?: {
        audio_tokens?: number;
      };
    },
    isStreaming = false
  ): LMRouterApiCallUsage {
    return {
      service_tier: service_tier ?? undefined,
      input:
        (usage.prompt_tokens ?? 0) -
        (usage.prompt_tokens_details?.cached_tokens ?? 0) -
        (usage.prompt_tokens_details?.audio_tokens ?? 0),
      input_audio: usage.prompt_tokens_details?.audio_tokens ?? 0,
      output: isStreaming
        ? (usage.completion_tokens ?? 0)
        : (usage.completion_tokens ?? 0) -
          (usage.completion_tokens_details?.audio_tokens ?? 0),
      output_audio: usage.completion_tokens_details?.audio_tokens ?? 0,
      request: 1,
      input_cache_reads: usage.prompt_tokens_details?.cached_tokens ?? 0,
    };
  }

  async sendRequest(
    provider: LMRouterConfigProvider,
    request: ChatCompletionCreateParamsBase,
    _options?: OpenAIChatCompletionInputOptions,
  ): Promise<ChatCompletion> {
    const openai = this.getClient(provider);
    const completion = (await openai.chat.completions.create(
      request,
    )) as ChatCompletion;
    if (completion.usage) {
      this.usage = this.calculateUsage(completion.service_tier, completion.usage);
    }
    return completion;
  }

  async sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ChatCompletionCreateParamsBase,
    _options?: OpenAIChatCompletionInputOptions,
  ): Promise<AsyncGenerator<ChatCompletionChunk>> {
    const openai = this.getClient(provider);
    const stream = await openai.chat.completions.create(request);
    return async function* (this: OpenAIChatCompletionOpenAIAdapter) {
      for await (const chunk of stream as Stream<ChatCompletionChunk>) {
        if (chunk.usage) {
          this.usage = this.calculateUsage(chunk.service_tier, chunk.usage, true);
        }
        yield chunk;
      }
    }.bind(this)();
  }
}
