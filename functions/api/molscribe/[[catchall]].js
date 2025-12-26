export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const targetBase = "https://yujieq-molscribe.hf.space";

  const newPath = url.pathname.replace(/^\/api\/molscribe/, "");
  
  const destinationUrl = targetBase + newPath + url.search;

  const newRequest = new Request(destinationUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });

  try {
    const response = await fetch(newRequest);
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}