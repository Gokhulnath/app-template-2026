import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Stack } from "./stack";

function Box({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-subtle text-xs text-accent">
      {children ?? ""}
    </div>
  );
}

const meta = {
  title: "Components/Stack",
  component: Stack,
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = {
  render: () => (
    <Stack gap={2}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
    </Stack>
  ),
};

export const Row: Story = {
  render: () => (
    <Stack direction="row" gap={2}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
    </Stack>
  ),
};

export const JustifyBetween: Story = {
  render: () => (
    <Stack direction="row" justify="between" className="w-64">
      <Box>1</Box>
      <Box>2</Box>
    </Stack>
  ),
};

export const Wrap: Story = {
  render: () => (
    <Stack direction="row" gap={2} wrap className="w-40">
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i}>{i + 1}</Box>
      ))}
    </Stack>
  ),
};
