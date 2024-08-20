import threading
import os

import websocket
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from logger import log_info, log_warn
from websocket_connection_manager import WebSocketConnectionManager

# the index of the current audio track from 0 to 9
current_index = -1
# the timer that periodically advances the current audio track
t = None
# websocket connection to the inference server
ws = None
ws_url = ""
ws_connection_manager = WebSocketConnectionManager()
active_listeners = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ws, ws_url

    ws_url = os.environ.get("INFERENCE_SERVER_WS_URL")
    if not ws_url:
        ws_url = "ws://localhost:8001"

    advance()

    yield

    if ws:
        ws.close()
    if t:
        t.cancel()


def generate_new_audio():
    if not ws_url:
        return

    global current_index

    offset = 0
    if current_index == 0:
        offset = 5
    elif current_index == 5:
        offset = 0
    else:
        return

    log_info("generating new audio...")

    try:
        ws = websocket.create_connection(ws_url)

        ws.send("generate")

        wavs = []
        for i in range(5):
            raw = ws.recv()
            if isinstance(raw, str):
                continue
            wavs.append(raw)

        for i, wav in enumerate(wavs):
            with open(f"{i + offset}.mp3", "wb") as f:
                f.write(wav)

        log_info("audio generated.")

        ws.close()
    except:
        log_warn(
            "inference server potentially unreachable. recycling cached audio for now."
        )


def advance():
    global current_index, t

    if current_index == 9:
        current_index = 0
    else:
        current_index = current_index + 1
    threading.Thread(target=generate_new_audio).start()

    t = threading.Timer(60, advance)
    t.start()


app = FastAPI(lifespan=lifespan)


@app.get("/current.mp3")
def get_current_audio():
    return FileResponse(f"{current_index}.mp3")


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws_connection_manager.connect(ws)

    addr = ""
    if ws.client:
        addr, _ = ws.client
    else:
        await ws.close()
        ws_connection_manager.disconnect(ws)

    await ws_connection_manager.broadcast(f"{len(active_listeners)}")

    try:
        while True:
            msg = await ws.receive_text()

            if msg == "playing":
                active_listeners.add(addr)
                await ws_connection_manager.broadcast(f"{len(active_listeners)}")
            elif msg == "paused":
                active_listeners.discard(addr)
                await ws_connection_manager.broadcast(f"{len(active_listeners)}")

    except WebSocketDisconnect:
        active_listeners.discard(addr)
        ws_connection_manager.disconnect(ws)
        await ws_connection_manager.broadcast(f"{len(active_listeners)}")


app.mount("/", StaticFiles(directory="web", html=True), name="web")
