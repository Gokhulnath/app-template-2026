// Generates content/docs/reference/mcp-tools.mdx from the tool definitions in
// apps/api/src/api/mcp.py, by building that MCP server in-process and listing its tools
// (see apps/api/scripts/export_mcp_tools.py) -- never by hand, and never against a
// running API or database.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

interface JsonSchema {
  type?: string;
  anyOf?: JsonSchema[];
  description?: string;
  default?: unknown;
}

interface McpTool {
  name: string;
  description: string;
  input_schema: {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  annotations: {
    read_only_hint?: boolean;
    destructive_hint?: boolean;
    idempotent_hint?: boolean;
  };
}

const apiDir = path.resolve(import.meta.dirname, "../../api");
const outputFile = path.resolve(
  import.meta.dirname,
  "../content/docs/reference/mcp-tools.mdx",
);

const raw = execFileSync(
  "uv",
  ["run", "python", "scripts/export_mcp_tools.py"],
  {
    cwd: apiDir,
    encoding: "utf-8",
  },
);
const tools: McpTool[] = JSON.parse(raw);

function typeOf(schema: JsonSchema): string {
  if (schema.anyOf) return schema.anyOf.map(typeOf).join(" or ");
  return schema.type ?? "unknown";
}

function badges(tool: McpTool): string {
  const { read_only_hint, destructive_hint, idempotent_hint } =
    tool.annotations;
  const labels = [
    read_only_hint && "read-only",
    destructive_hint && "destructive",
    idempotent_hint && "idempotent",
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "writes data";
}

function parameterTable(tool: McpTool): string {
  const properties = tool.input_schema.properties ?? {};
  const names = Object.keys(properties);
  if (names.length === 0) return "No parameters.";

  const required = new Set(tool.input_schema.required ?? []);
  const rows = names.map((name) => {
    const schema = properties[name];
    const isRequired = required.has(name) ? "yes" : "no";
    const description = schema.description ?? "";
    return `| \`${name}\` | ${typeOf(schema)} | ${isRequired} | ${description} |`;
  });

  return [
    "| Name | Type | Required | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

const sections = tools.map(
  (tool) => `## \`${tool.name}\`

${tool.description}

**${badges(tool)}**

${parameterTable(tool)}`,
);

const content = `---
title: MCP tools
description: myapp's MCP tools (/mcp), generated from their definitions in apps/api.
---

Served over MCP (Streamable HTTP) at \`/mcp\` -- see
[Claude Code and MCP](/docs/use/claude-code-mcp) for how to connect to it.

${sections.join("\n\n")}
`;

writeFileSync(outputFile, content);
