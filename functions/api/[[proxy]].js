
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 构建 Google 端点 URL
  const path = params.proxy ? params.proxy.join('/') : '';
  // 强制使用 v1alpha 端点，它目前对 Live/Bidi 支持最完整
  const targetUrl = new URL(`https://generativelanguage.googleapis.com/${path}${url.search}`);

  // 2. 处理跨域预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 3. 准备请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');
  
  // 注入 API Key
  const apiKeyInHeader = headers.get('x-goog-api-key');
  const apiKeyInUrl = targetUrl.searchParams.get('key');
  
  const isPlaceholder = (k) => !k || ['proxy_key', 'undefined', 'null'].includes(k.toLowerCase());

  if (env.API_KEY) {
    if (isPlaceholder(apiKeyInHeader)) headers.set('x-goog-api-key', env.API_KEY);
    if (isPlaceholder(apiKeyInUrl)) targetUrl.searchParams.set('key', env.API_KEY);
  }

  try {
    // 4. 处理 WebSocket (Live API 核心)
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const response = await fetch(targetUrl.toString(), { headers });

      if (response.status === 101) {
        const [client, server] = new WebSocketPair();
        const googleSocket = response.webSocket;
        if (!googleSocket) throw new Error("No upstream WebSocket");
        
        googleSocket.accept();
        server.accept();
        
        server.addEventListener('message', e => googleSocket.send(e.data));
        googleSocket.addEventListener('message', e => server.send(e.data));
        server.addEventListener('close', () => googleSocket.close());
        googleSocket.addEventListener('close', () => server.close());

        return new Response(null, { status: 101, webSocket: client });
      }
      
      return response;
    }

    // 5. 常规 REST API 转发
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
      redirect: 'manual'
    });

    const finalResponse = new Response(response.body, response);
    finalResponse.headers.set('Access-Control-Allow-Origin', '*');
    return finalResponse;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy Error", message: err.message }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
