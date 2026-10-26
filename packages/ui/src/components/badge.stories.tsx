import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stack } from "./stack";
import { Badge } from "./badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <Stack direction="row" gap={2} wrap>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="accent">Accent</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="danger">Danger</Badge>
    </Stack>
  ),
};

export const WithDot: Story = {
  render: () => (
    <Stack direction="row" gap={2} wrap>
      <Badge tone="success" dot>
        Live
      </Badge>
      <Badge tone="warning" dot>
        Reconnecting…
      </Badge>
    </Stack>
  ),
};
