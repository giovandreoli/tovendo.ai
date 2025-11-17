from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import random
import json
import asyncio

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

salas = {}  # { codigo_sala: { "jogadores": {ws: nome}, "pontos": {nome: int}, "rodada": int } }
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
        salas[sala] = {"jogadores": {}, "pontos": {}, "rodada": 0, "max_rodadas": 3, "jogador_achou": None}

    salas[sala]["jogadores"][websocket] = nome
    salas[sala]["pontos"].setdefault(nome, 0)

    # Se primeira pessoa entrou, iniciar primeira rodada
    if salas[sala]["rodada"] == 0:
        await iniciar_rodada(sala)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg["type"] == "achei":
                # Ignora se já alguém achou a cor nesta rodada
                if salas[sala]["jogador_achou"] is None:
                    salas[sala]["jogador_achou"] = nome
                    salas[sala]["pontos"][nome] += 1

                    # Envia ponto e quem ganhou a rodada
                    for ws in salas[sala]["jogadores"].keys():
                        await ws.send_json({
                            "type": "ponto",
                            "pontos": salas[sala]["pontos"]
                        })

                    if salas[sala]["pontos"][nome] >= 3:
                        # Determina vencedor final
                        pontos = salas[sala]["pontos"]
                        max_pontos = max(pontos.values())
                        vencedores = [j for j, p in pontos.items() if p == max_pontos]
                        vencedor_final = ", ".join(vencedores)
                        for ws in list(salas[sala]["jogadores"].keys()):
                            await ws.send_json({
                                "type": "vencedor_final",
                                "nome": vencedor_final
                            })
                        # Encerra o jogo: não envia mais cores
                        return
                    else:
                        # Delay antes de iniciar nova rodada para evitar processamento imediato
                        await asyncio.sleep(3)
                        salas[sala]["rodada"] += 1
                        salas[sala]["jogador_achou"] = None

                        if salas[sala]["rodada"] >= salas[sala]["max_rodadas"]:
                            # Determina vencedor final
                            pontos = salas[sala]["pontos"]
                            max_pontos = max(pontos.values())
                            vencedores = [j for j, p in pontos.items() if p == max_pontos]
                            vencedor_final = ", ".join(vencedores)
                            for ws in list(salas[sala]["jogadores"].keys()):
                                await ws.send_json({
                                    "type": "vencedor_final",
                                    "nome": vencedor_final
                                })
                            ##

                        else:
                            await iniciar_rodada(sala)
   

    except WebSocketDisconnect:
        del salas[sala]["jogadores"][websocket]

async def iniciar_rodada(sala: str):
    cor = sortear_cor()
    for ws in salas[sala]["jogadores"].keys():
        await ws.send_json({"type": "cor", "cor": cor})
