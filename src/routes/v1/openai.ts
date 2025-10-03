// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import type { ContextEnv } from "../../types/hono.js";
import openaiV1Router from "./openai/v1.js";

const openaiRouter = new Hono<ContextEnv>();

openaiRouter.route("/v1", openaiV1Router);

export default openaiRouter;
