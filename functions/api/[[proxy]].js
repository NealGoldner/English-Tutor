
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 构建目标 Google API URL
  const targetPath = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}${url.search}`);

  // 2. 准备请求头，保留原始鉴权头
  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', 'generativelanguage.googleapis.com');
  
  // 3. 关键补丁：如果客户端没传 Key 或传了占位符，由后端 Proxy 补全
  const clientApiKey = request.headers.get('x-goog-api-key');
  if (!clientApiKey || clientApiKey === 'API_KEY_PLACEHOLDER') {
    if (env.API_KEY) {
      newHeaders.set('x-goog-api-key', env.API_KEY);
    }
  }

  // 4. 特殊处理 WebSocket 握手
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader === "websocket") {
    // 手机端关键：直接将请求透传给 Google，不进行二次 Request 构造以防破坏握手
    return fetch(googleUrl.toString(), {
      headers: newHeaders,
    });
  }

  // 5. 处理普通 REST/JSON 请求
  try {
    const newRequest = new Request(googleUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    });

    const response = await fetch(newRequest);
    
    // 6. 注入跨域头
    const res = new Response(response.body, response);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', '*');
    
    return res;
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Proxy Connection Error", 
      message: err.message 
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
