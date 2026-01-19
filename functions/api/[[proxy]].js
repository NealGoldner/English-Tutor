
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 映射到 Google API 目标地址
  const path = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${path}${url.search}`);

  // 2. 准备请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');
  
  // 3. 增强版占位符识别
  const headerKey = headers.get('x-goog-api-key');
  const urlKey = googleUrl.searchParams.get('key');
  
  const isPlaceholder = (k) => {
    if (!k) return true;
    const key = k.toLowerCase();
    return key === 'proxy_key' || 
           key === 'api_key_placeholder' || 
           key === 'undefined' || 
           key === 'empty_key_use_proxy_injection';
  };

  if (env.API_KEY) {
    if (isPlaceholder(headerKey)) {
      headers.set('x-goog-api-key', env.API_KEY);
    }
    if (isPlaceholder(urlKey)) {
      googleUrl.searchParams.set('key', env.API_KEY);
    }
  }

  // 处理 OPTIONS 预检
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
    // 4. WebSocket 隧道 (Live API)
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      const [client, server] = new WebSocketPair();
      
      const serverResponse = await fetch(googleUrl.toString(), {
        headers: headers,
      });

      if (serverResponse.status === 101) {
        const webSocket = serverResponse.webSocket;
        if (!webSocket) throw new Error("Backend did not provide a websocket");
        
        webSocket.accept();
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

    // 5. REST 转发
    const response = await fetch(googleUrl.toString(), {
      method: request.method,
      headers: headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
      redirect: 'manual'
    });

    const newRes = new Response(response.body, response);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    newRes.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newRes.headers.set('Access-Control-Allow-Headers', '*');
    
    return newRes;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Gateway Error", message: err.message }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
