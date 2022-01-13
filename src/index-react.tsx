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

import { config, consoleLog, SandboxState } from "shared";

// The component we make available:
interface RainwayProps {
  stream: RainwayStream | undefined;
}
const Rainway: React.FC<RainwayProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stream = props.stream;
  useEffect(() => {
    if (props.stream) {
      containerRef.current!.appendChild(props.stream.container);
    }
    return () => {
      if (props.stream)
        containerRef.current?.removeChild(props.stream.container);
      stream?.leave();
    };
  }, [stream]);
  return <div ref={containerRef}>{props.stream ? "" : "Loading…"}</div>;
};

// The component the SDK user writes:
const Demo: React.FC = () => {
  const [peerId, setPeerId] = useState<string>(
    config.peerId ?? localStorage.getItem("peer-id") ?? "000000000000000000",
  );
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("api-key") || config.apiKey || "NO_KEY",
  );
  const [uiState, setUIState] = useState(SandboxState.Disconnected);
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [peer, setPeer] = useState<RainwayPeer | undefined>();
  const [currentStream, setStream] = useState<RainwayStream | undefined>();
  const minimumLogLevel = config.minimumLogLevel ?? RainwayLogLevel.Debug;

  /** Instantiate runtime if not yet built, connect it to instant relay. */
  const connectToRelay = async (): Promise<void> => {
    // Make and attach the Rainway client.
    setUIState(SandboxState.ConnectingToRelay);
    let rt: RainwayRuntime;
    if (!runtime) {
      rt = await RainwayRuntime.initialize({
        apiKey: apiKey,
        externalId: "web-sdk-demo-sandbox",
        onRuntimeConnectionLost: (error) => {
          console.log("Connection lost:", error);
          setUIState(SandboxState.Disconnected);
          setPeer(undefined);
          setStream(undefined);
        },
        onConnectionRequest: (request) => {
          // Auto-accept every request.
          request.accept();
        },
        onPeerMessage: (peer, data) => {
          console.log("onPeerMessage", peer, data);
        },
        onPeerError: (peer, error) => {
          console.warn("onPeerError", peer, error);
        },
        onPeerConnect: (peer) => {
          console.log("onPeerConnect", peer);
        },
        onPeerDisconnect: (peer) => {
          setPeer(undefined);
        },
        onStreamAnnouncement: (peer, announcement) => {
          // Don't do anything when a peer announces a stream (currently)
        },
        onStreamStop: (stream) => {
          setStream(undefined);
        },
        logSink: (level, message) =>
          level >= minimumLogLevel && consoleLog(level, message),
      });
      setRuntime(rt);
    } else {
      rt = runtime;
    }
    // This call is not strictly necessary if the runtime was just constructed:
    await rt.connectToGateway();
    // The runtime automatically connects to instant relay when initialized.
    setUIState(SandboxState.ConnectedToRelay);
  };

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
      <button disabled={!!runtime} onClick={connectToRelay}>
        Connect
      </button>
      <button
        disabled={!(runtime && !peer)}
        onClick={async () => {
          setPeer(await runtime?.connect(BigInt(peerId)));
        }}
      >
        Connect to peer
      </button>
      <button
        disabled={!(peer && !currentStream)}
        onClick={async () => {
          const stream = await peer!.requestStream(
            InputLevel.Mouse | InputLevel.Keyboard,
          );
          setStream(stream);
        }}
      >
        Start stream
      </button>
      <button
        disabled={!(peer && currentStream)}
        onClick={async () => {
          setStream(undefined);
        }}
      >
        Stop stream
      </button>
      <div style={{ width: 800, height: 600, background: "#ccccdd" }}>
        <Rainway stream={currentStream} />
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
  document.getElementById("react-root"),
);
