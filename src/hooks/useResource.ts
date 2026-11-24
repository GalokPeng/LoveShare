import { useEffect, useState } from "react";
import { adminError } from "../lib/admin-data";

export function useResource<T>(request: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    request: typeof request; revision: number; data?: T; error?: string;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    void request(controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ request, revision, data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setResult({ request, revision, error: adminError(error, "加载失败，请重试。") });
      }
    });
    return () => controller.abort();
  }, [request, revision]);

  const current = result?.request === request && result.revision === revision ? result : undefined;

  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    reload: () => setRevision((value) => value + 1),
  };
}
