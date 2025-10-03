// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  TranscriptionCreateParamsBase,
  TranscriptionCreateResponse,
  TranscriptionStreamEvent,
} from "openai/resources/audio/transcriptions";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import type { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAITranscriptionsOpenAIAdapter } from "./openai.js";

export type OpenAITranscriptionsAdapter = LMRouterAdapter<
  TranscriptionCreateParamsBase,
  {},
  TranscriptionCreateResponse | string,
  TranscriptionStreamEvent
>;

const adapters: Record<string, new () => OpenAITranscriptionsAdapter> = {
  others: OpenAITranscriptionsOpenAIAdapter,
};

export class OpenAITranscriptionsAdapterFactory {
  static getAdapter(
    provider: LMRouterConfigProvider,
  ): OpenAITranscriptionsAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      return new adapters.others();
    }
    return new adapters[provider.type]();
  }
}
