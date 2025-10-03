// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { getConnInfo as getConnInfoNode } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { getRuntimeKey } from "hono/adapter";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type {
  LMRouterConfigModel,
  LMRouterConfigModelProvider,
  LMRouterConfigProvider,
} from "../types/config.js";
import type { ContextEnv } from "../types/hono.js";
import { recordApiCall } from "./billing.js";
import { TimeKeeper } from "./chrono.js";
import { getConfig } from "./config.js";

export const getUptime = (): string | undefined => {
  if (getRuntimeKey() === "workerd") {
    return;
  }

  const seconds = Math.floor(process.uptime());
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const uptime = `${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`;
  return uptime;
};

export const getRemoteIp = (c: Context<ContextEnv>): string | undefined => {
  switch (getRuntimeKey()) {
    case "node":
      return getConnInfoNode(c).remote.address;
    default:
      return;
  }
};

export const getModel = (
  modelName: string,
  c: Context<ContextEnv>,
): LMRouterConfigModel | null => {
  const cfg = getConfig(c);

  if (c.var.auth?.type === "access-key" || c.var.auth?.type === "byok") {
    const colonIndex = modelName.indexOf(":");
    if (colonIndex !== -1) {
      const providerName = modelName.slice(0, colonIndex);
      const provider = cfg.providers[providerName];
      if (provider) {
        return {
          providers: [
            {
              provider: providerName,
              model: modelName.slice(colonIndex + 1),
            },
          ],
        };
      }
    }
  }

  const model = cfg.models[modelName];
  if (model) {
    return model;
  }

  if (c.var.auth?.type === "access-key" || c.var.auth?.type === "byok") {
    if (cfg.models["*"]) {
      return {
        providers: cfg.models["*"].providers.map((provider) => ({
          provider: provider.provider,
          model: modelName,
        })),
      };
    }
  }

  return null;
};

// type HttpStatusCode = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503 | 504;

interface ApiError extends Error {
  status?: ContentfulStatusCode;
  error?: {
    error?: { message?: string };
    message?: string;
  };
}

export const iterateModelProviders = async <T>(
  c: Context<ContextEnv>,
  cb: (
    providerCfg: LMRouterConfigModelProvider,
    provider: LMRouterConfigProvider,
  ) => Promise<T>,
): Promise<T | Response> => {
  const cfg = getConfig(c);
  let error: ApiError | null = null;

  if (!c.var.model) {
    return c.json(
      {
        error: {
          message: "Model is not set",
        },
      },
      500,
    );
  }

  for (const providerCfg of c.var.model.providers) {
    const provider = cfg.providers[providerCfg.provider];
    if (!provider) {
      continue;
    }

    const hydratedProvider = { ...provider };
    hydratedProvider.api_key =
      c.var.auth?.type === "byok" ? c.var.auth.byok : provider.api_key;

    const timeKeeper = new TimeKeeper();
    try {
      timeKeeper.record();
      return await cb(providerCfg, hydratedProvider);
    } catch (e) {
      timeKeeper.record();
      const apiError = e as ApiError;
      await recordApiCall(
        c,
        providerCfg.provider,
        apiError.status ?? 500,
        timeKeeper.timestamps(),
        undefined,
        providerCfg.pricing,
        apiError.error?.error?.message ??
          apiError.error?.message ??
          apiError.message,
      );
      error = apiError;
      if (cfg.server.logging === "dev") {
        console.error(e);
      }
    }
  }

  if (error) {
    return c.json(
      {
        error: error.error?.error ??
          error.error ?? {
            message: error.message,
          },
      },
      error.status || 500,
    );
  }

  return c.json(
    {
      error: {
        message: "All providers failed to complete the request",
      },
    },
    500 as 500,
  );
};
