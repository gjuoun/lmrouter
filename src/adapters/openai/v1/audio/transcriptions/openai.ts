// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type { Stream } from "openai/core/streaming";
import type {
  TranscriptionCreateParamsBase,
  TranscriptionCreateParamsNonStreaming,
  TranscriptionCreateParamsStreaming,
  TranscriptionCreateResponse,
  TranscriptionStreamEvent,
} from "openai/resources/audio/transcriptions";
import type { LMRouterApiCallUsage } from "../../../../../types/billing.js";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";
import { getAudioDuration } from "../../../../../utils/audio.js";
import type { OpenAITranscriptionsAdapter } from "./adapter.js";

export class OpenAITranscriptionsOpenAIAdapter
  implements OpenAITranscriptionsAdapter
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
    request: TranscriptionCreateParamsBase,
    _options?: unknown,
  ): Promise<TranscriptionCreateResponse | string> {
    const openai = this.getClient(provider);
    const transcription = (await openai.audio.transcriptions.create(
      request as TranscriptionCreateParamsNonStreaming,
    )) as TranscriptionCreateResponse | string;
    if (typeof transcription === "string") {
      this.usage = {
        input_audio_time: Math.ceil(
          (await getAudioDuration(request.file as File)) ?? 0,
        ),
        request: 1,
      };
    } else {
      this.usage = {
        input:
          transcription.usage?.type === "tokens"
            ? transcription.usage.input_tokens -
              (transcription.usage.input_token_details?.audio_tokens ?? 0)
            : 0,
        input_audio:
          transcription.usage?.type === "tokens"
            ? (transcription.usage.input_token_details?.audio_tokens ?? 0)
            : 0,
        input_audio_time:
          transcription.usage?.type === "duration"
            ? transcription.usage.seconds
            : 0,
        output:
          transcription.usage?.type === "tokens"
            ? transcription.usage.output_tokens
            : 0,
        request: 1,
      };
    }
    return transcription;
  }

  async sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: TranscriptionCreateParamsBase,
    _options?: unknown,
  ): Promise<AsyncGenerator<TranscriptionStreamEvent>> {
    const openai = this.getClient(provider);
    const transcription = await openai.audio.transcriptions.create(
      request as TranscriptionCreateParamsStreaming,
    );
    return async function* (this: OpenAITranscriptionsOpenAIAdapter) {
      for await (const chunk of transcription as Stream<TranscriptionStreamEvent>) {
        if (chunk.type === "transcript.text.done") {
          this.usage = {
            input:
              (chunk.usage?.input_tokens ?? 0) -
              (chunk.usage?.input_token_details?.audio_tokens ?? 0),
            input_audio: chunk.usage?.input_token_details?.audio_tokens ?? 0,
            output: chunk.usage?.output_tokens ?? 0,
            request: 1,
          };
        }
        yield chunk;
      }
    }.bind(this)();
  }
}
