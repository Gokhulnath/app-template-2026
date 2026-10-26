import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stack } from "./stack";
import { Text } from "./text";

const meta = {
  title: "Components/Text",
  component: Text,
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap={2}>
      <Text variant="body">Body text, the default.</Text>
      <Text variant="small">Small text, for dense UI.</Text>
      <Text variant="muted">Muted text, for secondary details.</Text>
    </Stack>
  ),
};

export const LongText: Story = {
  args: {
    variant: "body",
    children:
      "A longer paragraph of body copy, long enough to wrap across multiple lines, so line-height and measure can be checked at a glance.",
  },
};
