import { Heading, Stack, Text } from "@myapp/ui";

import { ApiStatus } from "@/components/api-status";
import { RuntimeInfo } from "@/components/runtime-info";
import { API_URL } from "@/lib/api";

export default function Home() {
  return (
    <main className="flex-1 p-8 sm:p-16">
      <Stack align="center" gap={4}>
        <Heading level={1}>myapp</Heading>
        <Text variant="muted">
          API status: <ApiStatus />
        </Text>
        <Text as="span" variant="muted">
          API: <code>{API_URL}</code>
        </Text>
        <Text as="span" variant="muted">
          Running in: <RuntimeInfo />
        </Text>
      </Stack>
    </main>
  );
}
