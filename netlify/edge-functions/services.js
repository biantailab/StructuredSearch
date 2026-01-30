async function handleProxyRequest(request, nodes) {
  const url = new URL(request.url);

  const cleanPath = url.pathname + url.search;

  let requestBody = null;
  if (["POST", "PUT"].includes(request.method)) {
    try {
      requestBody = await request.text();
    } catch (e) {
    }
  }

  let lastError;

  for (const nodeBase of nodes) {
    try {
      const targetUrl = nodeBase + cleanPath;

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "application/json"
        },
        body: requestBody,
        signal: AbortSignal.timeout(5000)
      });

      if (response.status) {
        return new Response(response.body, {
          status: response.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": response.headers.get("Content-Type") || "application/json"
          }
        });
      }
    } catch (err) {
      lastError = err;
    }
  }

  return new Response(JSON.stringify({ 
    error: "Service Gateway Error", 
    message: "All upstream nodes are unreachable.",
    debug: lastError?.message 
  }), {
    status: 502,
    headers: { "Content-Type": "application/json" }
  });
}

export default async (request, context) => {
  const envString = Deno.env.get("UPSTREAM_NODES");
  let nodes = [];

  try {
    nodes = envString ? JSON.parse(envString) : [];
  } catch (e) {
    return new Response("Configuration Error: Invalid UPSTREAM_NODES JSON.", { status: 500 });
  }

  if (nodes.length === 0) {
    return new Response("Configuration Error: UPSTREAM_NODES is not set.", { status: 500 });
  }

  return handleProxyRequest(request, nodes);
};