// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type { Stream } from "openai/core/streaming";
import type {
  ImageGenerateParamsBase,
  ImageGenStreamEvent,
  ImagesResponse,
} from "openai/resources/images";
import type { LMRouterApiCallUsage } from "../../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import type { OpenAIImageGenerationAdapter } from "./adapter.js";

export class OpenAIImageGenerationOpenAIAdapter
  implements OpenAIImageGenerationAdapter
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
    request: ImageGenerateParamsBase,
    _options?: unknown,
  ): Promise<ImagesResponse> {
    const openai = this.getClient(provider);
    const image = await openai.images.generate(request);
    this.usage = {
      input:
        ((image as ImagesResponse).usage?.input_tokens ?? 0) -
        ((image as ImagesResponse).usage?.input_tokens_details.image_tokens ??
          0),
      input_image:
        (image as ImagesResponse).usage?.input_tokens_details.image_tokens ?? 0,
      output: (image as ImagesResponse).usage?.output_tokens ?? 0,
      image: (image as ImagesResponse).data?.length ?? 0,
      image_quality: (image as ImagesResponse).quality,
      image_size: (image as ImagesResponse).size,
      request: 1,
    };
    return image as ImagesResponse;
  }

  async sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ImageGenerateParamsBase,
    _options?: unknown,
  ): Promise<AsyncGenerator<ImageGenStreamEvent>> {
    const openai = this.getClient(provider);
    const stream = await openai.images.generate(request);
    return async function* (this: OpenAIImageGenerationOpenAIAdapter) {
      for await (const chunk of stream as Stream<ImageGenStreamEvent>) {
        if (chunk.type === "image_generation.completed") {
          this.usage = {
            input:
              chunk.usage.input_tokens -
              chunk.usage.input_tokens_details.image_tokens,
            input_image: chunk.usage.input_tokens_details.image_tokens,
            output: chunk.usage.output_tokens,
            image: 1,
            image_quality: chunk.quality,
            image_size: chunk.size,
            request: 1,
          };
          yield chunk;
        }
      }
    }.bind(this)();
  }
}
