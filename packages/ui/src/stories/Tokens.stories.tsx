import type { Meta, StoryObj } from "@storybook/react-vite";
import { tokens } from "@myapp/tokens";

import { Card } from "../components/card";
import { Heading } from "../components/heading";
import { Stack } from "../components/stack";
import { Text } from "../components/text";

const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <Stack direction="row" align="center" gap={3}>
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-lg border border-border"
        style={{ background: value }}
      />
      <Stack gap={1}>
        <Text as="span" variant="small" className="font-mono">
          {name}
        </Text>
        <Text as="span" variant="muted" className="font-mono">
          {value}
        </Text>
      </Stack>
    </Stack>
  );
}

function ColorTheme({ theme }: { theme: "light" | "dark" }) {
  const colors = tokens.color[theme];
  return (
    <Card className="p-6">
      <Heading level={3} size="sm" className="mb-4 capitalize">
        {theme}
      </Heading>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(colors).map(([name, value]) => (
          <Swatch key={name} name={name} value={value} />
        ))}
      </div>
    </Card>
  );
}

export const Colors: Story = {
  render: () => (
    <Stack gap={6}>
      <ColorTheme theme="light" />
      <ColorTheme theme="dark" />
    </Stack>
  ),
};

export const TypeScale: Story = {
  render: () => (
    <Stack gap={4}>
      {Object.entries(tokens.font.size).map(([name, size]) => (
        <Stack key={name} direction="row" align="center" gap={4}>
          <Text as="span" variant="muted" className="w-16 shrink-0 font-mono">
            {name}
          </Text>
          <span style={{ fontSize: size }}>The quick brown fox jumps.</span>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Spacing: Story = {
  render: () => (
    <Stack gap={3}>
      {Object.entries(tokens.space)
        .filter(([name]) => name !== "unit")
        .map(([name, size]) => (
          <Stack key={name} direction="row" align="center" gap={4}>
            <Text as="span" variant="muted" className="w-10 shrink-0 font-mono">
              {name}
            </Text>
            <span
              aria-hidden="true"
              className="h-4 rounded-sm bg-accent"
              style={{ width: size }}
            />
            <Text as="span" variant="muted" className="font-mono">
              {size}
            </Text>
          </Stack>
        ))}
    </Stack>
  ),
};

export const RadiusAndShadow: Story = {
  render: () => (
    <Stack direction="row" gap={6} wrap>
      {Object.entries(tokens.radius).map(([name, radius]) => (
        <Stack key={name} gap={2} align="center">
          <div
            className="h-16 w-16 border border-border bg-surface-muted"
            style={{ borderRadius: radius }}
          />
          <Text as="span" variant="muted" className="font-mono">
            radius.{name}
          </Text>
        </Stack>
      ))}
      {Object.entries(tokens.shadow).map(([name, shadow]) => (
        <Stack key={name} gap={2} align="center">
          <div
            className="h-16 w-16 rounded-lg bg-surface"
            style={{ boxShadow: shadow }}
          />
          <Text as="span" variant="muted" className="font-mono">
            shadow.{name}
          </Text>
        </Stack>
      ))}
    </Stack>
  ),
};
