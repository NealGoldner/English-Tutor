
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 映射到 Google API 目标地址
  const path = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${path}${url.search}`);

  // 2. 准备请求头，清除可能导致冲突的宿主头
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');
  
  // 3. API KEY 注入逻辑
  const headerKey = headers.get('x-goog-api-key');
  const urlKey = googleUrl.searchParams.get('key');
  const isPlaceholder = (k) => !k || k === 'PROXY_KEY' || k === 'API_KEY_PLACEHOLDER' || k === 'undefined';

  if (env.API_KEY) {
    if (isPlaceholder(headerKey)) {
      headers.set('x-goog-api-key', env.API_KEY);
    }
    if (isPlaceholder(urlKey)) {
      googleUrl.searchParams.set('key', env.API_KEY);
    }
  }

  // 处理 OPTIONS 预检请求
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

  try {
    // 4. 处理 WebSocket 握手 (Live API 的核心)
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      // 在 Cloudflare Workers 环境下转发 WebSocket
      const [client, server] = new WebSocketPair();
      
      const serverResponse = await fetch(googleUrl.toString(), {
        headers: headers,
        edispatch: true, // 开启 WebSocket 转发
      });

      if (serverResponse.status === 101) {
        // 成功建立隧道
        const webSocket = serverResponse.webSocket;
        if (!webSocket) throw new Error("Google didn't return a websocket");
        
        webSocket.accept();
        
        // 双向管道
        server.accept();
        server.addEventListener('message', event => webSocket.send(event.data));
        webSocket.addEventListener('message', event => server.send(event.data));
        
        server.addEventListener('close', () => webSocket.close());
        webSocket.addEventListener('close', () => server.close());

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }
      return serverResponse;
    }

    // 5. 普通 REST 请求转发
    const response = await fetch(googleUrl.toString(), {
      method: request.method,
      headers: headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
      redirect: 'manual'
    });

    // 6. 响应封装与 CORS
    const newRes = new Response(response.body, response);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    newRes.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newRes.headers.set('Access-Control-Allow-Headers', '*');
    
    return newRes;
  } catch (err) {
    console.error("Tunnel Error:", err);
    return new Response(JSON.stringify({ 
      error: "Connection Interrupted", 
      message: err.message,
      hint: "系统正在尝试自动恢复，请稍候。"
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
