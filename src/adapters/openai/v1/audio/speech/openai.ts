// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { HTTPException } from "hono/http-exception";
import OpenAI from "openai";
import type { SpeechCreateParams } from "openai/resources/audio/speech";
import type { LMRouterApiCallUsage } from "../../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import type { OpenAISpeechAdapter } from "./adapter.js";

export class OpenAISpeechOpenAIAdapter implements OpenAISpeechAdapter {
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

  async sendRequest(
    provider: LMRouterConfigProvider,
    request: SpeechCreateParams,
    _options?: {},
  ): Promise<Response> {
    const openai = this.getClient(provider);
    const speech = await openai.audio.speech.create(request);
    this.usage = {
      input: request.input.length,
      request: 1,
    };
    return speech;
  }

  async sendRequestStreaming(
    _provider: LMRouterConfigProvider,
    _request: SpeechCreateParams,
    _options?: {},
  ): Promise<AsyncGenerator<never>> {
    throw new HTTPException(400, {
      message: "Speech API does not support streaming",
    });
  }
}
