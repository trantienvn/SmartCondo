import { useEffect, useState } from "react";
import { api } from "../api";
import type { ApiResult } from "../types";

export type Remote<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
};

export function useRemote<T>(path: string, property?: string): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const reload = () => setRevision((value) => value + 1);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");

    api<ApiResult<Record<string, unknown>>>(path)
      .then((result) => {
        if (active) setData((property ? result.data[property] : result.data) as T);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, property, revision]);

  return { data, loading, error, reload };
}
