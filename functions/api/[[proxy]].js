
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 构造目标 Google API URL
  const path = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${path}${url.search}`);

  // 2. 准备请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');
  
  // 3. 核心注入逻辑
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

  // 4. 发起转发请求
  try {
    // 处理 WebSocket 握手
    const upgradeHeader = request.headers.get('Upgrade');
    const isWebSocket = upgradeHeader && upgradeHeader.toLowerCase() === 'websocket';

    const response = await fetch(googleUrl.toString(), {
      method: isWebSocket ? 'GET' : request.method,
      headers: headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD' && !isWebSocket) ? request.body : null,
      redirect: 'manual'
    });

    // 5. 握手响应
    if (response.status === 101) {
      return response;
    }

    // 6. 普通响应处理与 CORS
    const newRes = new Response(response.body, response);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    newRes.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newRes.headers.set('Access-Control-Allow-Headers', '*');
    
    return newRes;
  } catch (err) {
    console.error("Tunnel Error:", err);
    return new Response(JSON.stringify({ 
      error: "Secure Tunnel Interrupted", 
      message: err.message,
      hint: "请尝试刷新页面或更换网络接入点"
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
