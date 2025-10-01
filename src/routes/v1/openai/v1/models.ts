// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";

import type { ContextEnv } from "../../../../types/hono.js";
import { getConfig } from "../../../../utils/config.js";

interface OpenAIModel {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

interface OpenAIModelListResponse {
  object: "list";
  data: OpenAIModel[];
}

const modelsRouter = new Hono<ContextEnv>();

modelsRouter.get("/:model{.+}", (c) => {
  const cfg = getConfig(c);
  const modelName = c.req.param("model");
  const model = cfg.models[modelName];
  if (!model) {
    return c.json(
      {
        error: {
          message: "Model not found",
        },
      },
      404,
    );
  }

  return c.json({
    id: modelName,
    object: "model",
    created: model.created ?? 0,
    owned_by: model.providers.map((provider) => provider.provider).join(", "),
  });
});

modelsRouter.get("/", (c) => {
  const cfg = getConfig(c);
  const models: OpenAIModel[] = Object.entries(cfg.models).map(([name, model]) => {
    return {
      id: name,
      object: "model",
      created: model.created ?? 0,
      owned_by: model.providers.map((provider) => provider.provider).join(", "),
    };
  });

  return c.json<OpenAIModelListResponse>({
    object: "list",
    data: models,
  });
});

export default modelsRouter;
