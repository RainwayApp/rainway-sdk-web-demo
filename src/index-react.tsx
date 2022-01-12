import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "style.css";

import {
    RainwayPeer,
    RainwayStream,
    RainwayError,
    RainwayLogLevel,
    RainwayRuntime,
    InputLevel,
} from "rainway-sdk";

import { config, SandboxState } from "shared";

const Demo: React.FC = () => {
    const [peerId, setPeerId] = useState<string>(
        config.peerId ??
            localStorage.getItem("peer-id") ??
            "000000000000000000",
    );
    const [apiKey, setApiKey] = useState(
        localStorage.getItem("api-key") || config.apiKey || "NO_KEY",
    );
    const [uiState, setUIState] = useState(SandboxState.Disconnected);
    const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
    const [peer, setPeer] = useState<RainwayPeer | undefined>();
    const containerRef = useRef<HTMLDivElement>(null);
    const minimumLogLevel = config.minimumLogLevel ?? RainwayLogLevel.Debug;

    /** Log to web console based on Rainway log level. */
    const consoleLog = (level: RainwayLogLevel, message: string): void => {
        if (level >= RainwayLogLevel.Error) {
            console.error(message);
        } else if (level >= RainwayLogLevel.Warning) {
            console.warn(message);
        } else if (level >= RainwayLogLevel.Information) {
            console.info(message);
        } else {
            console.log(message);
        }
    };

    const handleLog = (level: RainwayLogLevel, message: string): void => {
        if (level >= minimumLogLevel) {
            consoleLog(level, message);
        }
    };

    /** Instantiate runtime if not yet built, connect it to instant relay. */
    async function connectToRelay(): Promise<void> {
        // Make and attach the Rainway client.
        setUIState(SandboxState.ConnectingToRelay);
        let rt: RainwayRuntime;
        if (!runtime) {
            rt = await RainwayRuntime.initialize({
                apiKey: apiKey,
                externalId: "web-sdk-demo-sandbox",
                // Listener for instant relay connection loss
                onRuntimeConnectionLost: (error) => {
                    console.log("Connection lost:", error);
                    setUIState(SandboxState.Disconnected);
                },
                // Listener for incoming connection requests
                onConnectionRequest: (request) => {
                    // Auto-accept every request.
                    request.accept();
                },
                // Listener for incoming arbitrary messages
                onPeerMessage: (peer, data) => {
                    // the only arbitrary messages we're listening for are basic chat messages
                    // const w = this.widgets.find((w) => w.peer === peer);
                    // if (w === undefined) return;
                    // w.displayChatMessage(
                    //     w.hostNickname(),
                    //     new TextDecoder().decode(data),
                    // );
                },
                // Listener for errors from particular peers
                onPeerError: (peer, error) => {},
                // Listener for when a peer finishes connecting
                onPeerConnect: (peer) => {},
                // Listener for peer disconnect
                onPeerDisconnect: (peer) => {
                    // remove appropriate stream container when a peer disconnects
                    // const w = this.widgets.find((w) => w.peer === peer);
                    // if (w === undefined) return;
                    // w.peer = undefined;
                    // if (w.state > SandboxWidgetState.Disconnected) {
                    //     w.setUIState(SandboxWidgetState.Disconnected);
                    // }
                    // if (w.stream !== undefined) w.stream.container.remove();
                },
                // Listener for peer stream announcement. Hosts can announce streams to clients.
                // Don't do anything when a peer announces a stream (currently)
                onStreamAnnouncement: (peer, announcement) => {},
                // Listener for stream stop
                onStreamStop: (stream) => {
                    // When the stream stops, remove the container from the DOM
                    // const w = this.widgets.find(
                    //     (w) => w.peer?.stream === stream,
                    // );
                    // if (w === undefined) return;
                    // stream.container.remove();
                    // if (
                    //     w.state >
                    //     SandboxWidgetState.ConnectedToHostReadyToStream
                    // ) {
                    //     w.setUIState(
                    //         SandboxWidgetState.ConnectedToHostReadyToStream,
                    //     );
                    // }
                },
                // logSink is just a function that accepts a loglevel and a string
                // all internal SDK logs will be sent there
                logSink: handleLog,
            });
            setRuntime(rt);
        } else {
            rt = runtime;
        }
        // This call is not strictly necessary if the runtime was just constructed:
        await rt.connectToGateway();
        // The runtime automatically connects to instant relay when initialized.
        setUIState(SandboxState.ConnectedToRelay);
    }

    return (
        <div className="page-container">
            <label htmlFor="apiKey">API key</label>
            <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
            <br />
            <label htmlFor="peerId">Peer ID</label>
            <input
                id="peerId"
                type="text"
                value={peerId}
                onChange={(e) => setPeerId(e.target.value)}
            />
            <br />
            {SandboxState[uiState]}
            <br />
            <button
                disabled={!!runtime}
                onClick={() => {
                    connectToRelay();
                }}
            >
                Connect
            </button>
            <button
                disabled={!runtime}
                onClick={async () => {
                    setPeer(await runtime?.connect(BigInt(peerId)));
                }}
            >
                Connect to peer
            </button>
            <button
                disabled={!peer}
                onClick={async () => {
                    const stream = await peer!.requestStream(
                        InputLevel.Mouse | InputLevel.Keyboard,
                    );
                    console.log(stream);
                    containerRef.current?.appendChild(stream.container);
                }}
            >
                Start stream
            </button>
            <div ref={containerRef}></div>
        </div>
    );
};

ReactDOM.render(
    <React.StrictMode>
        <Demo />
    </React.StrictMode>,
    document.getElementById("react-root"),
);
