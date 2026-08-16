import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const appHandler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Proxy Lovable assets CDN
    if (url.pathname.startsWith("/__l5e/assets-v1/")) {
      try {
        const assetUrl = `https://andromedaplay.lovable.app${url.pathname}`;
        const assetResponse = await fetch(assetUrl);
        return assetResponse;
      } catch (error) {
        console.error("Asset proxy error:", error);
      }
    }

    try {
      return await appHandler(request);
    } catch (error) {
      console.error(error);
      return new Response(
        "<!DOCTYPE html><html><head><title>Error</title></head><body><h1>500 Internal Server Error</h1><p>Please try again later.</p></body></html>",
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }
  },
};
