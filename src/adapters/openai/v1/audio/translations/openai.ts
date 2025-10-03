// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { HTTPException } from "hono/http-exception";
import OpenAI from "openai";
import type {
  TranslationCreateParams,
  TranslationCreateResponse,
} from "openai/resources/audio/translations";
import type { LMRouterApiCallUsage } from "../../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import { getAudioDuration } from "../../../../../utils/audio.js";
import type { OpenAITranslationsAdapter } from "./adapter.js";

export class OpenAITranslationsOpenAIAdapter
  implements OpenAITranslationsAdapter
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

  async sendRequest(
    provider: LMRouterConfigProvider,
    request: TranslationCreateParams,
    _options?: {},
  ): Promise<TranslationCreateResponse | string> {
    const openai = this.getClient(provider);
    const translation = await openai.audio.translations.create(request);
    this.usage = {
      input_audio_time: Math.ceil(
        (await getAudioDuration(request.file as File)) ?? 0,
      ),
      request: 1,
    };
    return translation;
  }

  async sendRequestStreaming(
    _provider: LMRouterConfigProvider,
    _request: TranslationCreateParams,
    _options?: {},
  ): Promise<AsyncGenerator<never>> {
    throw new HTTPException(400, {
      message: "Translations API does not support streaming",
    });
  }
}
