import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert } from "./alert";
import { Button } from "./button";

const meta = {
  title: "Components/Alert",
  component: Alert,
  parameters: { layout: "padded" },
  // As wide as the card an alert usually sits in, so the action stays beside the message.
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { title: "Couldn't load data", description: "Check your connection." },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {
  args: {
    tone: "danger",
    action: (
      <Button size="sm" variant="secondary">
        Retry
      </Button>
    ),
  },
};

export const Warning: Story = {
  args: { tone: "warning", title: "Reconnecting…", description: undefined },
};

export const Success: Story = {
  args: { tone: "success", title: "Saved", description: undefined },
};

export const Info: Story = {
  args: { tone: "info", title: "New release available" },
};

export const WithoutAction: Story = {
  args: { tone: "danger", action: undefined },
};
