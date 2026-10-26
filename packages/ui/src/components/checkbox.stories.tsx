import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { Stack } from "./stack";
import { Checkbox } from "./checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { label: "Buy milk" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  render: () => (
    <Stack gap={2}>
      <Checkbox label="Disabled, unchecked" disabled />
      <Checkbox label="Disabled, checked" disabled defaultChecked />
    </Stack>
  ),
};

export const LongLabel: Story = {
  args: {
    label:
      "A title long enough that it would wrap onto a second line, to check the box stays aligned with the first line of text",
  },
};

export const Toggles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", { name: "Buy milk" });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();
  },
};
