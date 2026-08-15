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
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
