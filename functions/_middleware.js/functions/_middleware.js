const UPSTREAM_ORIGIN = "https://og-picks-platform.gibranhernaandez26.chatgpt.site";

export async function onRequest(context) {
  const incomingUrl = new URL(context.request.url);
  const upstreamBase = new URL(UPSTREAM_ORIGIN);
  const upstreamUrl = new URL(context.request.url);

  upstreamUrl.protocol = upstreamBase.protocol;
  upstreamUrl.hostname = upstreamBase.hostname;
  upstreamUrl.port = upstreamBase.port;

  const requestHeaders = new Headers(context.request.headers);
  requestHeaders.delete("host");

  const incomingOrigin = incomingUrl.origin;
  const origin = requestHeaders.get("origin");
  if (origin === incomingOrigin) {
    requestHeaders.set("origin", UPSTREAM_ORIGIN);
  }

  const referer = requestHeaders.get("referer");
  if (referer && referer.startsWith(incomingOrigin)) {
    requestHeaders.set(
      "referer",
      referer.replace(incomingOrigin, UPSTREAM_ORIGIN)
    );
  }

  const upstreamRequest = new Request(upstreamUrl.toString(), {
    method: context.request.method,
    headers: requestHeaders,
    body:
      context.request.method === "GET" || context.request.method === "HEAD"
        ? undefined
        : context.request.body,
    redirect: "manual",
  });

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamRequest);
  } catch (error) {
    return new Response(
      "OG PICKS no pudo conectar temporalmente con el sitio principal.",
      { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);

  const location = responseHeaders.get("location");
  if (location) {
    const rewrittenLocation = location
      .replace(UPSTREAM_ORIGIN, incomingOrigin)
      .replace(upstreamBase.hostname, incomingUrl.hostname);
    responseHeaders.set("location", rewrittenLocation);
  }

  const contentType = responseHeaders.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let html = await upstreamResponse.text();

    html = html
      .replaceAll(UPSTREAM_ORIGIN, incomingOrigin)
      .replaceAll(upstreamBase.hostname, incomingUrl.hostname);

    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("etag");

    return new Response(html, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
