import { ApiStatus } from "@/components/api-status";
import { RuntimeInfo } from "@/components/runtime-info";
import { API_URL } from "@/lib/api";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">myapp</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        API status: <ApiStatus />
      </p>
      <p className="text-sm text-zinc-500">
        API: <code>{API_URL}</code>
      </p>
      <p className="text-sm text-zinc-500">
        Running in: <RuntimeInfo />
      </p>
    </main>
  );
}
