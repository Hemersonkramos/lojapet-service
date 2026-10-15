from fastapi import FastAPI, Request, Response
import httpx

app = FastAPI(
    title="API Gateway - PetShop",
    description="Ponto único de entrada para os microsserviços do sistema",
    version="1.0.0"
)

# Mapeamento dos microsserviços da arquitetura
SERVICES = {
    "cadastros": "http://localhost:8081",
    "loja": "http://localhost:8082",
    "agendamento": "http://localhost:8083"
}

@app.api_route("/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def reverse_proxy(service: str, path: str, request: Request):
    # Verifica se o serviço solicitado existe no dicionário
    if service not in SERVICES:
        return Response(
            content='{"error": "Serviço não encontrado no Gateway"}',
            status_code=404,
            media_type="application/json"
        )

    target_url = f"{SERVICES[service]}/{path}"

    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)  # Remove o host original para evitar conflitos de porta

    async with httpx.AsyncClient() as client:
        try:
            proxy_res = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=request.query_params,
                content=body,
                timeout=15.0
            )

            return Response(
                content=proxy_res.content,
                status_code=proxy_res.status_code,
                headers=dict(proxy_res.headers)
            )
        except httpx.RequestError:
            return Response(
                content='{"error": "Microsserviço temporariamente indisponível"}',
                status_code=503,
                media_type="application/json"
            )

@app.get("/")
def gateway_root():
    return {
        "status": "API Gateway ativo com sucesso!",
        "rotas_disponiveis": {
            "Cadastros": "/cadastros/...",
            "Loja": "/loja/...",
            "Agendamento": "/agendamento/..."
        }
    }
