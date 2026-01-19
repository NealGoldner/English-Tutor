
export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  
  // 1. 构建目标 Google API URL
  const targetPath = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}${url.search}`);

  // 2. 准备请求头
  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', 'generativelanguage.googleapis.com');
  
  // 移除可能引起干扰的 Cloudflare 特有头
  newHeaders.delete('cf-connecting-ip');
  newHeaders.delete('cf-ipcountry');
  newHeaders.delete('cf-ray');
  newHeaders.delete('cf-visitor');

  // 3. 特殊处理 WebSocket 握手 (Gemini Live API 使用 WebSocket)
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader === "websocket") {
    // WebSocket 必须透传 headers 以保持认证信息
    return fetch(googleUrl.toString(), {
      headers: newHeaders,
    });
  }

  // 4. 处理普通 REST/JSON 请求 (TTS, Suggestions, Dictionary)
  try {
    const newRequest = new Request(googleUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    });

    const response = await fetch(newRequest);
    
    // 5. 注入跨域头
    const res = new Response(response.body, response);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', '*');
    
    return res;
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Proxy Error", 
      message: err.message,
      target: googleUrl.toString() 
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
