
export async function onRequest(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  
  // 1. 解析目标路径 (例如从 /api/v1alpha/xxx 提取 v1alpha/xxx)
  const path = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${path}${url.search}`);

  // 2. 复制并修正请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'generativelanguage.googleapis.com');
  
  // 3. 核心补丁：如果前端传的是占位符或没传，后端自动注入真实的 Key
  const authKey = headers.get('x-goog-api-key');
  if (!authKey || authKey === 'PROXY_KEY' || authKey === 'API_KEY_PLACEHOLDER') {
    if (env.API_KEY) {
      headers.set('x-goog-api-key', env.API_KEY);
    }
  }

  // 4. 特殊处理 WebSocket (Gemini Live 核心协议)
  if (request.headers.get("Upgrade") === "websocket") {
    // 手机端直连：直接 fetch 会自动处理 WebSocket 升级
    return fetch(googleUrl.toString(), {
      headers: headers
    });
  }

  // 5. 处理普通 HTTP 请求 (TTS, 建议生成等)
  try {
    const response = await fetch(googleUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    });

    // 6. 注入跨域头
    const newRes = new Response(response.body, response);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    newRes.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newRes.headers.set('Access-Control-Allow-Headers', '*');
    
    return newRes;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy Failed", message: err.message }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
