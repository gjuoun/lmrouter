// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type { Stream } from "openai/core/streaming";
import type {
  Response,
  ResponseCreateParamsBase,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import type { LMRouterApiCallUsage } from "../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../types/config.js";
import type {
  OpenAIResponsesAdapter,
  OpenAIResponsesInputOptions,
} from "./adapter.js";

export class OpenAIResponsesOpenAIAdapter implements OpenAIResponsesAdapter {
  usage?: LMRouterApiCallUsage;
  response?: Response;

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

  async sendRequest(
    provider: LMRouterConfigProvider,
    request: ResponseCreateParamsBase,
    _options?: OpenAIResponsesInputOptions,
  ): Promise<Response> {
    const openai = this.getClient(provider);
    const response = await openai.responses.create(request);
    this.usage = {
      service_tier: (response as Response).service_tier ?? undefined,
      input:
        ((response as Response).usage?.input_tokens ?? 0) -
        ((response as Response).usage?.input_tokens_details.cached_tokens ?? 0),
      output: (response as Response).usage?.output_tokens ?? 0,
      web_search: (response as Response).output.filter(
        (o) => o.type === "web_search_call",
      ).length,
      code_interpreter: (response as Response).output.filter(
        (o) => o.type === "code_interpreter_call",
      ).length,
      request: 1,
      input_cache_reads:
        (response as Response).usage?.input_tokens_details.cached_tokens ?? 0,
    };
    return response as Response;
  }

  async sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ResponseCreateParamsBase,
    _options?: OpenAIResponsesInputOptions,
  ): Promise<AsyncGenerator<ResponseStreamEvent>> {
    const openai = this.getClient(provider);
    const stream = await openai.responses.create(request);
    return async function* (this: OpenAIResponsesOpenAIAdapter) {
      for await (const chunk of stream as Stream<ResponseStreamEvent>) {
        if (chunk.type === "response.completed") {
          this.usage = {
            service_tier: chunk.response.service_tier ?? undefined,
            input:
              (chunk.response.usage?.input_tokens ?? 0) -
              (chunk.response.usage?.input_tokens_details.cached_tokens ?? 0),
            output: chunk.response.usage?.output_tokens ?? 0,
            web_search: chunk.response.output.filter(
              (o) => o.type === "web_search_call",
            ).length,
            code_interpreter: chunk.response.output.filter(
              (o) => o.type === "code_interpreter_call",
            ).length,
            request: 1,
            input_cache_reads:
              chunk.response.usage?.input_tokens_details.cached_tokens ?? 0,
          };
          this.response = chunk.response;
        }
        yield chunk;
      }
    }.bind(this)();
  }
}
