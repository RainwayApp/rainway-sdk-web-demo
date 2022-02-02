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
import { Rainway } from "./Rainway";
import { Widget } from "./Widget";

/// A peer that may have disconnected (but if so, we remember its ID).
interface MaybePeer {
  peerId: bigint;
  peer: RainwayPeer | undefined;
}

export const Demo = () => {
  const [apiKey, setApiKey] = useLocalStorage("api-key", "");
  const [uiState, setUIState] = useState(SandboxState.Disconnected);
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [peers, setPeers] = useState<MaybePeer[]>([]);

  // This "peerId" string is the value for the connect prompt.
  const [peerId, setPeerId] = useLocalStorage<string>(
    "peerId-widget1",
    "",
  );
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

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
          // TODO cause widgets to check and drop stream
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
    <div className="demo">
      <div className="m-b-8 flex">
        <h2>
          <label htmlFor="apiKey">API key</label>
        </h2>
        <div className="m-l-8 badge red">{SandboxState[uiState]}</div>
      </div>
      <input
        id="apiKey"
        type="text"
        size={36}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <button
        className="m-l-16"
        disabled={uiState !== SandboxState.Disconnected}
        onClick={connectToRelay}
      >
        Connect to Rainway
      </button>
      <div className="card flex">
        <h2>
          <label htmlFor="peerId">Peer ID</label>
        </h2>
        <input
          className="m-l-8"
          id="peerId"
          type="text"
          value={peerId}
          placeholder="511111111111111111"
          disabled={!runtime || connecting}
          onChange={(e) => setPeerId(e.target.value)}
        />
        <button
          className="m-l-8"
          disabled={!runtime || connecting}
          onClick={async () => {
            try {
              setConnecting(true);
              const peer = await runtime?.connect(BigInt(peerId));
              if (peer) {
                setPeers([...peers, { peer, peerId: peer.peerId }]);
                setConnectError("");
              }
            } catch (e) {
              setConnectError((e as Error).toString());
            } finally {
              setConnecting(false);
            }
          }}
        >
          {connecting ? "Connecting…" : "Connect to peer"}
        </button>{" "}
        {connectError}
      </div>
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
