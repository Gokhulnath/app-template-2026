import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Text } from "./text";

const meta = {
  title: "Components/Card",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <Badge tone="success" dot>
          Live
        </Badge>
      </CardHeader>
      <CardContent>
        <Text variant="muted">Everything is up to date.</Text>
        <Button>Refresh</Button>
      </CardContent>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>
        <Text>No header, just content.</Text>
      </CardContent>
    </Card>
  ),
};
