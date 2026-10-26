import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { TextField } from "./text-field";

const meta = {
  title: "Components/TextField",
  component: TextField,
  args: { label: "Title", placeholder: "What is this for?" },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: "Shown to everyone with access to this list." },
};

export const WithError: Story = {
  args: {
    defaultValue: "",
    error: "A title is required.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Title");
    await expect(input).toHaveAccessibleDescription("A title is required.");
    await expect(input).toBeInvalid();
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Can't edit this" },
};

export const LongText: Story = {
  args: {
    label:
      "A label that runs long enough to wrap onto a second line on narrow screens",
    description:
      "And a description that is similarly long, to check that both wrap instead of overflowing the field.",
  },
};
