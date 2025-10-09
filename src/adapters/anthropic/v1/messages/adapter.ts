// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  Message,
  MessageCreateParamsBase,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import type { LMRouterConfigProvider } from "../../../../types/config.js";
import type { LMRouterAdapter } from "../../../adapter.js";
import { AnthropicMessagesAnthropicAdapter } from "./anthropic.js";
import { AnthropicMessagesOthersAdapter } from "./others.js";

export interface AnthropicMessagesInputOptions {
  maxTokens?: number;
}

export type AnthropicMessagesAdapter = LMRouterAdapter<
  MessageCreateParamsBase,
  AnthropicMessagesInputOptions,
  Message,
  RawMessageStreamEvent
>;

const adapters: Record<string, new () => AnthropicMessagesAdapter> = {
  anthropic: AnthropicMessagesAnthropicAdapter,
  others: AnthropicMessagesOthersAdapter,
};

export class AnthropicMessagesAdapterFactory {
  static getAdapter(
    provider: LMRouterConfigProvider,
  ): AnthropicMessagesAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      return new adapters.others();
    }
    return new adapters[provider.type]();
  }
}
