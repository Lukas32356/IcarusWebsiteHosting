from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
import json
import os

app = Flask(__name__)

socketio = SocketIO(
    app,
    cors_allowed_origins="*"
)

MARKER_FILE = "markers.json"


def load_markers():
    if not os.path.exists(MARKER_FILE):
        return []

    try:
        with open(
            MARKER_FILE,
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    except Exception:
        return []


def save_markers(markers):
    with open(
        MARKER_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            markers,
            file,
            ensure_ascii=False,
            indent=4
        )


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def files(path):
    return send_from_directory(".", path)


@socketio.on("get_markers")
def get_markers():

    markers = load_markers()

    emit(
        "markers_loaded",
        markers
    )


@socketio.on("save_markers")
def receive_markers(markers):

    save_markers(markers)

    socketio.emit(
        "markers_updated",
        markers
    )


if __name__ == "__main__":

    print()
    print("==============================")
    print("      ICARUS OLYMPUS MAP")
    print("==============================")
    print()
    print("Website:")
    print("http://localhost:5000")
    print()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        allow_unsafe_werkzeug=True
    )