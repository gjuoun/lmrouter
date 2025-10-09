// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import fs from "node:fs";

import type { Context } from "hono";
import yaml from "yaml";

import type { LMRouterConfig } from "../types/config.js";
import type { ContextEnv } from "../types/hono.js";

let configCache: LMRouterConfig | null = null;
const _configCacheRaw: string | null = null;

export const getConfig = (_c?: Context<ContextEnv>): LMRouterConfig => {
  if (configCache) {
    return configCache;
  }

  const configPath = new URL("../../config/config.yaml", import.meta.url).pathname;

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}. Please create a config.yaml file.`);
  }

  console.log(`Loading config from file "${configPath}"...`);
  configCache = yaml.parse(
    fs.readFileSync(configPath, "utf8"),
  ) as LMRouterConfig;
  return configCache;
};
