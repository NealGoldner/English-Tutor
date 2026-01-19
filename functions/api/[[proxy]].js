
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 获取路径
  const path = params.proxy ? params.proxy.join('/') : '';
  
  // 关键修复：Live API 目前在 v1alpha 上最稳定。
  // 我们将所有请求强制映射到 Google 的 v1alpha 端点。
  let targetPath = path;
  if (!path.startsWith('v1alpha') && !path.startsWith('v1beta')) {
    targetPath = `v1alpha/${path}`;
  }

  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}${url.search}`);

  // 2. 注入 API Key
  if (env.API_KEY) {
    if (!googleUrl.searchParams.has('key')) {
      googleUrl.searchParams.set('key', env.API_KEY);
    }
  }

  // 3. 处理跨域预检
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

  // 4. WebSocket 升级处理
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
    // 使用 fetch 直接转发，让底层平台处理 WebSocket 协议握手
    return fetch(googleUrl.toString(), {
      headers: request.headers,
    });
  }

  // 5. 常规 REST 请求转发
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');

  try {
    const response = await fetch(googleUrl.toString(), {
      method: request.method,
      headers: headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
      redirect: 'manual'
    });

    // 包装响应以支持 CORS
    const newRes = new Response(response.body, response);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    newRes.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newRes.headers.set('Access-Control-Allow-Headers', '*');
    
    return newRes;
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Gateway Proxy Error", 
      message: err.message,
      target: googleUrl.toString()
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
