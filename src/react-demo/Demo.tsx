import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import { useLocalStorage } from "./util";

import {
  RainwayPeer,
  RainwayStream,
  RainwayError,
  RainwayLogLevel,
  RainwayRuntime,
  InputLevel,
  RainwayChannelMode,
} from "rainway-sdk";

import { Chat, consoleLog, SandboxState } from "../shared";
import { Widget } from "./Widget";

/// A peer that may have disconnected (but if so, we remember its ID).
interface DemoPeer {
  peerId: bigint;
  peer: RainwayPeer | undefined;
  chatHistory: Chat[];
  streamStopCount: number;
}

function makePeer(peer: RainwayPeer): DemoPeer {
  return { peer, peerId: peer.peerId, chatHistory: [], streamStopCount: 0 };
}

export const Demo = () => {
  const [apiKey, setApiKey] = useLocalStorage("api-key", "");
  const [connectingRuntime, setConnectingRuntime] = useState(false);
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [peers, setPeers] = useState<DemoPeer[]>([
    // { peerId: BigInt(123), peer: undefined, chatHistory: [] },
  ]);

  function addChat(peer: RainwayPeer, chat: Chat) {
    setPeers((ps) =>
      ps.map((p) =>
        p.peerId === peer.peerId
          ? { ...p, chatHistory: [...p.chatHistory, chat] }
          : p,
      ),
    );
  }

  // This "peerId" string is the value for the connect prompt.
  const [peerId, setPeerId] = useLocalStorage<string>("peerId-widget1", "");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  /** Instantiate runtime if not yet built, connect it to instant relay. */
  const connectToRelay = async (): Promise<void> => {
    // Make and attach the Rainway client.
    let rt: RainwayRuntime;
    if (!runtime) {
      setConnectingRuntime(true);
      try {
        rt = await RainwayRuntime.initialize({
          apiKey: apiKey,
          externalId: "web-demo-react",
          onRuntimeConnectionLost: (error) => {
            console.log("Connection lost:", error);
            setRuntime(undefined);
            setPeers([]);
          },
          onConnectionRequest: (request) => {
            // Auto-accept every request.
            request.accept();
          },
          onPeerMessage: (peer, ch, data) => {
            const chat: Chat = {
              type: "incoming",
              message: new TextDecoder().decode(data),
            };
            addChat(peer, chat);
          },
          onPeerDataChannel: () => {},
          onPeerError: (peer, error: RainwayError) => {
            console.warn("onPeerError", peer, error);
          },
          onPeerConnect: (peer) => {
            const found = peers.find((p) => p.peerId === peer.peerId);
            if (!found) {
              setPeers((ps) => [...ps, makePeer(peer)]);
            }
          },
          onPeerDisconnect: (peer) => {
            console.warn("onPeerDisconnect", peer);
            setPeers((ps) =>
              ps.map((p) =>
                p.peerId === peer.peerId ? { ...p, peer: undefined } : p,
              ),
            );
          },
          onStreamAnnouncement: (peer, announcement) => {
            // Don't do anything when a peer announces a stream (currently)
          },
          onStreamStop: (stream) => {
            setPeers((ps) =>
              ps.map((p) =>
                [...(p.peer?.streams.values() ?? [])].some((s) => s === stream)
                  ? { ...p, streamStopCount: p.streamStopCount + 1 }
                  : p,
              ),
            );
          },
          logSink: (level, message) => consoleLog(level, message),
        });
        setRuntime(rt);
      } finally {
        setConnectingRuntime(false);
      }
    } else {
      rt = runtime;
    }
    await rt.connectToGateway();
  };

  return (
    <div className="demo">
      <div className="m-b-8 flex">
        <h2>
          <label htmlFor="apiKey">API key</label>
        </h2>
        {runtime ? (
          <div className="m-l-8 badge ok">Connected</div>
        ) : connectingRuntime ? (
          <div className="m-l-8 badge">Connecting…</div>
        ) : (
          <div className="m-l-8 badge">Disconnected</div>
        )}
      </div>
      <input
        id="apiKey"
        type="text"
        size={36}
        value={apiKey}
        disabled={runtime !== undefined || connectingRuntime}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <button
        className="m-l-16"
        disabled={runtime !== undefined || connectingRuntime}
        onClick={connectToRelay}
      >
        Connect to Rainway
      </button>
      {peers.map((p) => (
        <Widget
          key={p.peerId.toString()}
          peer={p.peer}
          peerId={p.peerId}
          chatHistory={p.chatHistory}
          sendChat={(message) => {
            if (p.peer) {
              addChat(p.peer, { type: "outgoing", message });
              p.peer.send("Message", new TextEncoder().encode(message));
            }
          }}
          disconnect={() => {
            p.peer?.disconnect();
            setPeers((ps) => ps.filter((x) => x.peerId !== p.peerId));
          }}
          streamStopCount={p.streamStopCount}
        />
      ))}
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
          className="m-l-8 m-r-16"
          disabled={!runtime || connecting}
          onClick={async () => {
            console.log(peerId);
            try {
              setConnecting(true);
              const peer = await runtime?.connect(BigInt(peerId));
              if (peer) {
                peer.createDataChannel("Message", RainwayChannelMode.Reliable);
                setConnectError("");
              }
            } catch (e) {
              setConnectError(
                (e as Error).toString().replace(/.*Rainway SDK Error: /, ""),
              );
            } finally {
              setConnecting(false);
            }
          }}
        >
          {connecting ? "Connecting…" : "Connect to peer"}
        </button>
        {connectError}
      </div>
    </div>
  );
};
