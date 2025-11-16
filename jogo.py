from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import random
import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

salas = {}  # { codigo_sala: { "jogadores": {ws: nome}, "pontos": {nome: int}, "rodada": 0 } }

CORES = ["vermelho", "verde", "azul", "amarelo", "rosa", "laranja", "roxo"]


def sortear_cor():
    return random.choice(CORES)


@app.get("/")
def home():
    return HTMLResponse(open("static/index.html").read())


@app.websocket("/ws/{sala}/{nome}")
async def websocket_endpoint(websocket: WebSocket, sala: str, nome: str):
    await websocket.accept()

    if sala not in salas:
        salas[sala] = {"jogadores": {}, "pontos": {}, "rodada": 0}

    salas[sala]["jogadores"][websocket] = nome
    salas[sala]["pontos"].setdefault(nome, 0)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            # Jogador achou a cor
            if msg["type"] == "achei":
                salas[sala]["pontos"][nome] += 1

                # Enviar para todos
                for ws in salas[sala]["jogadores"].keys():
                    await ws.send_json({
                        "type": "ponto",
                        "nome": nome,
                        "pontos": salas[sala]["pontos"]
                    })

                # Verifica vencedor
                if salas[sala]["pontos"][nome] >= 3:
                    for ws in salas[sala]["jogadores"].keys():
                        await ws.send_json({
                            "type": "vencedor",
                            "nome": nome
                        })
                else:
                    # Nova rodada
                    cor = sortear_cor()
                    salas[sala]["rodada"] += 1
                    for ws in salas[sala]["jogadores"].keys():
                        await ws.send_json({
                            "type": "cor",
                            "cor": cor
                        })

    except WebSocketDisconnect:
        del salas[sala]["jogadores"][websocket]
