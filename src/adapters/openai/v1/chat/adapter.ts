// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
} from "openai/resources/chat/completions";
import type { LMRouterConfigProvider } from "../../../../types/config.js";
import type { LMRouterAdapter } from "../../../adapter.js";
import { OpenAIChatCompletionAnthropicAdapter } from "./anthropic.js";
import { OpenAIChatCompletionOpenAIAdapter } from "./openai.js";

export interface OpenAIChatCompletionInputOptions {
  maxTokens?: number;
}

export type OpenAIChatCompletionAdapter = LMRouterAdapter<
  ChatCompletionCreateParamsBase,
  OpenAIChatCompletionInputOptions,
  ChatCompletion,
  ChatCompletionChunk
>;

const adapters: Record<string, new () => OpenAIChatCompletionAdapter> = {
  anthropic: OpenAIChatCompletionAnthropicAdapter,
  others: OpenAIChatCompletionOpenAIAdapter,
};

export class OpenAIChatCompletionAdapterFactory {
  static getAdapter(
    provider: LMRouterConfigProvider,
  ): OpenAIChatCompletionAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      return new adapters.others();
    }
    return new adapters[provider.type]();
  }
}
