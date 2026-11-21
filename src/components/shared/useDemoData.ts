import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeDemoData } from '../../services/demoService';

export function useDemoData<T>(load: () => Promise<T>, pollIntervalMs: number = 2500) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loader = useRef(load);
  useEffect(() => { loader.current = load; });

  const refresh = useCallback(async () => {
    try {
      const next = await loader.current();
      setData(next);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu demo.');
    }
  }, []);

  useEffect(() => {
    let live = true;
    let request = 0;
    const runLoad = async () => {
      const id = ++request;
      try {
        const next = await loader.current();
        if (live && request === id) {
          setData(next);
          setError('');
        }
      } catch (e) {
        if (live && request === id) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu demo.');
      }
    };
    void runLoad();
    const off = subscribeDemoData(() => { void runLoad(); });

    let timer: any;
    if (pollIntervalMs > 0) {
      timer = setInterval(() => { void runLoad(); }, pollIntervalMs);
    }

    return () => {
      live = false;
      off();
      if (timer) clearInterval(timer);
    };
  }, [pollIntervalMs]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được dữ liệu demo.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { data, error, busy, run, setError, refresh };
}
