import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading } from "./heading";
import { Stack } from "./stack";

const meta = {
  title: "Components/Heading",
  component: Heading,
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <Stack gap={3}>
      <Heading level={1} size="xl">
        Heading xl
      </Heading>
      <Heading level={2} size="lg">
        Heading lg
      </Heading>
      <Heading level={3} size="md">
        Heading md
      </Heading>
      <Heading level={4} size="sm">
        Heading sm
      </Heading>
    </Stack>
  ),
};

export const LevelWithoutSize: Story = {
  args: { level: 2, children: "Defaults its size from the level" },
};
