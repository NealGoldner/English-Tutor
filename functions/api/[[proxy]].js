
export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  
  // 提取剩余路径，拼接 Google API 完整地址
  const targetPath = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}${url.search}`);

  // 处理 WebSocket 升级请求 (Gemini Live API)
  if (request.headers.get("Upgrade") === "websocket") {
    // Cloudflare fetch 能够透明地代理 WebSocket 连接
    return fetch(googleUrl.toString(), {
      headers: request.headers,
    });
  }

  // 处理普通 REST 请求
  const newRequest = new Request(googleUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(newRequest);
    // 复制响应并添加 CORS（如果需要，虽然同域不需要，但可以增加兼容性）
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
