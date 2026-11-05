import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const BEAT_MS = 30_000;

/**
 * Records one access session per lesson opening and sends heartbeats
 * with time on page (only while the tab is visible) and video time watched.
 */
export function useLessonSession(lessonId: string | null, enabled: boolean) {
  const sessionRef = useRef<string | null>(null);
  const pageAccum = useRef(0);
  const videoAccum = useRef(0);
  const lastVideoPos = useRef<number | null>(null);
  const lastTick = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !lessonId) return;
    let cancelled = false;
    sessionRef.current = null;
    pageAccum.current = 0;
    videoAccum.current = 0;
    lastVideoPos.current = null;
    lastTick.current = Date.now();

    const sb = supabase as any;
    void sb.rpc("start_lesson_session", { _lesson_id: lessonId }).then(({ data }: any) => {
      if (!cancelled && data) sessionRef.current = data as string;
    });

    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") pageAccum.current += (now - lastTick.current) / 1000;
      lastTick.current = now;
    };
    const flush = () => {
      tick();
      const id = sessionRef.current;
      const page = Math.round(pageAccum.current);
      const video = Math.round(videoAccum.current);
      if (!id || (page <= 0 && video <= 0)) return;
      pageAccum.current -= page;
      videoAccum.current -= video;
      void sb.rpc("heartbeat_lesson_session", { _session_id: id, _page_add: page, _video_add: video });
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else lastTick.current = Date.now();
    };
    const iv = window.setInterval(flush, BEAT_MS);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      flush();
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [lessonId, enabled]);

  const reportVideoPosition = useCallback((seconds: number) => {
    const prev = lastVideoPos.current;
    lastVideoPos.current = seconds;
    if (prev == null) return;
    const delta = seconds - prev;
    if (delta > 0 && delta <= 15) videoAccum.current += delta;
  }, []);

  return { reportVideoPosition };
}
