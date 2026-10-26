import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Stack } from "./stack";
import { IconButton } from "./icon-button";

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path
        d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.5 9.5A1 1 0 0 0 6 14.5h4a1 1 0 0 0 1-1L11.5 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  args: { "aria-label": "Delete", onClick: fn(), children: <TrashIcon /> },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <Stack direction="row" gap={3}>
      <IconButton {...args} variant="primary" />
      <IconButton {...args} variant="secondary" />
      <IconButton {...args} variant="ghost" />
      <IconButton {...args} variant="danger" />
    </Stack>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <Stack direction="row" align="center" gap={3}>
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
    </Stack>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};
