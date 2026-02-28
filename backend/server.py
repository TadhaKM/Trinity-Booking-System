"""
Reverse proxy: forwards all /api/* requests to the Next.js app on port 3000.
The Kubernetes ingress sends /api/* to this FastAPI on port 8001,
but the actual API routes live inside Next.js.
"""
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

NEXT_URL = "http://127.0.0.1:3000"

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_to_next(request: Request, path: str):
    target = f"{NEXT_URL}/api/{path}"
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=target,
                headers=headers,
                content=body,
                params=request.query_params,
            )
            return StreamingResponse(
                content=iter([resp.content]),
                status_code=resp.status_code,
                headers=dict(resp.headers),
            )
        except httpx.ConnectError:
            return JSONResponse({"error": "Next.js service unavailable"}, status_code=503)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)
