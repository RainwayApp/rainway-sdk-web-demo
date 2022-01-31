import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import { useLocalStorage } from "@rehooks/local-storage";

import {
  RainwayPeer,
  RainwayStream,
  RainwayError,
  RainwayLogLevel,
  RainwayRuntime,
  InputLevel,
} from "rainway-sdk";

import { consoleLog, SandboxState } from "../shared";
import { Rainway } from "./rainway";
import { Widget } from "./widget";

/// A peer that may have disconnected (but if so, we remember its ID).
interface MaybePeer {
  peerId: bigint;
  peer: RainwayPeer | undefined;
}

const Demo = () => {
  const [apiKey, setApiKey] = useLocalStorage("api-key", "NO_KEY");
  const [uiState, setUIState] = useState(SandboxState.Disconnected);
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [currentStream, setStream] = useState<RainwayStream | undefined>();
  const [peers, setPeers] = useState<MaybePeer[]>([]);

  // This "peerId" string is the value for the connect prompt.
  const [peerId, setPeerId] = useLocalStorage<string>("peerId-widget1", "00000");
  const [connecting, setConnecting] = useState(false);

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
          setPeers([]);
          setStream(undefined);
        },
        onConnectionRequest: (request) => {
          // Auto-accept every request.
          request.accept();
        },
        onPeerMessage: (peer, data) => {
          console.log("onPeerMessage", peer, data);
        },
        onPeerError: (peer, error: RainwayError) => {
          console.warn("onPeerError", peer, error);
        },
        onPeerConnect: (peer) => {
          const found = peers.find((p) => p.peerId === peer.peerId);
          if (!found) {
            setPeers([...peers, { peer, peerId: peer.peerId }]);
          }
        },
        onPeerDisconnect: (peer) => {
          setPeers(
            peers.map((p) =>
              p.peerId === peer.peerId ? { ...p, peer: undefined } : p,
            ),
          );
        },
        onStreamAnnouncement: (peer, announcement) => {
          // Don't do anything when a peer announces a stream (currently)
        },
        onStreamStop: (stream) => {
          setStream(undefined);
        },
        logSink: (level, message) => consoleLog(level, message),
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
      {SandboxState[uiState]}
      <br />
      <button
        disabled={uiState !== SandboxState.Disconnected}
        onClick={connectToRelay}
      >
        Connect
      </button>
      <br />
      <label htmlFor="peerId">Peer ID</label>
      <input
        id="peerId"
        type="text"
        value={peerId}
        onChange={(e) => setPeerId(e.target.value)}
      />
      <br />
      <button
        disabled={!runtime || connecting}
        onClick={async () => {
          try {
            setConnecting(true);
            const peer = await runtime?.connect(BigInt(peerId));
            if (peer) {
              setPeers([...peers, { peer, peerId: peer.peerId }]);
            }
          } catch (e) {
            console.log(e);
          } finally {
            setConnecting(false);
          }
        }}
      >
        Connect to peer
      </button>
      {peers.map((p) => (
        <Widget
          key={p.peerId.toString()}
          peer={p.peer}
          peerId={p.peerId}
          chatHistory={[]}
          sendChat={(message) =>
            p.peer?.send(new TextEncoder().encode(message))
          }
          disconnect={() => {
            p.peer?.disconnect();
            setPeers(peers.filter((x) => x.peerId !== p.peerId));
          }}
        />
      ))}
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
  document.getElementById("react-root"),
);
