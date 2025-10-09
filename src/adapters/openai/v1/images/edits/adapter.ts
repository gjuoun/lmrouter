// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  ImageEditParamsBase,
  ImageEditStreamEvent,
  ImagesResponse,
} from "openai/resources/images";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import type { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIImageEditFireworksAdapter } from "./fireworks.js";
import { OpenAIImageEditGoogleAdapter } from "./google.js";
import { OpenAIImageEditOpenAIAdapter } from "./openai.js";

export type OpenAIImageEditAdapter = LMRouterAdapter<
  ImageEditParamsBase,
  unknown,
  ImagesResponse,
  ImageEditStreamEvent
>;

const adapters: Record<string, new () => OpenAIImageEditAdapter> = {
  fireworks: OpenAIImageEditFireworksAdapter,
  google: OpenAIImageEditGoogleAdapter,
  others: OpenAIImageEditOpenAIAdapter,
};

export class OpenAIImageEditAdapterFactory {
  static getAdapter(provider: LMRouterConfigProvider): OpenAIImageEditAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      return new adapters.others();
    }
    return new adapters[provider.type]();
  }
}
