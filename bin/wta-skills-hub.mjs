#!/usr/bin/env node
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const { main } = await import("../dist/cli.js");
  process.exitCode = await main(process.argv.slice(2), root);
} catch (error) {
  console.error(error.code === "ERR_MODULE_NOT_FOUND"
    ? "安装包缺少构建产物或依赖。源码检出请运行 npm ci && npm run build；已发布包请重新安装。"
    : error.message);
  process.exitCode = 1;
}
