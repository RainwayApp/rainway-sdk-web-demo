import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import { useLocalStorage } from "./util";

import {
  RainwayPeer,
  RainwayError,
  RainwayRuntime,
  RainwayChannelMode,
  RainwayPeerState,
  RainwayStreamAnnouncement,
} from "rainway-sdk";

import { Chat, consoleLog } from "../shared";
import { Widget } from "./Widget";

/// A peer with some data relevant to the demo app tacked on.
interface DemoPeer {
  peerId: bigint;
  peer: RainwayPeer | undefined;
  announcements: RainwayStreamAnnouncement[];
  chatHistory: Chat[];
  streamStopCount: number;
}

/// Make a new DemoPeer from a RainwayPeer.
function makePeer(peer: RainwayPeer): DemoPeer {
  return {
    peer,
    peerId: peer.peerId,
    chatHistory: [],
    streamStopCount: 0,
    announcements: [],
  };
}

/// The main application component, which manages a list of DemoPeers and
/// renders them as interactable widgets.
export const Demo = () => {
  const [apiKey, setApiKey] = useLocalStorage("api-key", "");
  const [connectingRuntime, setConnectingRuntime] = useState(false);
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [peers, setPeers] = useState<DemoPeer[]>([]);

  function addChat(peer: RainwayPeer, chat: Chat) {
    setPeers((ps) =>
      ps.map((p) =>
        p.peerId === peer.peerId
          ? { ...p, chatHistory: [...p.chatHistory, chat] }
          : p,
      ),
    );
  }

  function addAnnouncement(
    peer: RainwayPeer,
    announcement: RainwayStreamAnnouncement,
  ) {
    setPeers((ps) =>
      ps.map((p) =>
        p.peerId === peer.peerId
          ? { ...p, announcements: [...p.announcements, announcement] }
          : p,
      ),
    );
  }

  // This "peerId" string is the value for the connect prompt.
  const [peerId, setPeerId] = useLocalStorage<string>("peerId-widget1", "");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const connectToRainway = async (): Promise<void> => {
    // Make and attach the Rainway client.
    let rt: RainwayRuntime;
    if (!runtime) {
      setConnectingRuntime(true);
      try {
        rt = await RainwayRuntime.initialize({
          apiKey: apiKey,
          externalId: "web-demo-react",
          onRuntimeConnectionLost: (rt, error) => {
            // When the connection is fatally lost, drop all peers.
            console.log("Connection lost:", error);
            setRuntime(undefined);
            setPeers([]);
          },
          onConnectionRequest: (rt, request) => {
            // Auto-accept every request.
            request.accept();
          },
          onPeerMessage: (rt, peer, ch, data) => {
            // Rainway offers arbitrary peer-to-peer data channel communication.
            // In our demo apps, we simply interpret the bytestreams as UTF-8
            // "chat messages" and display them in the right widget:
            const chat: Chat = {
              type: "incoming",
              message: new TextDecoder().decode(data),
            };
            addChat(peer, chat);
          },
          onPeerDataChannel: () => {
            // We don't particularly care about a data channel opening.
          },
          onPeerError: (rt, peer, error: RainwayError) => {
            // When a peer encounters an error, log it to the console.
            console.warn("onPeerError", peer, error);
          },
          onPeerStateChange: (rt, peer, state) => {
            // on connect
            if (state == RainwayPeerState.New) {
              // When a peer connection is established, add a DemoPeer/widget.
              const found = peers.find((p) => p.peerId === peer.peerId);
              if (!found) {
                setPeers((ps) => [...ps, makePeer(peer)]);
              }
            }
            // on disconnect
            else if (state == RainwayPeerState.Failed) {
              // When a peer connection is lost, remove a DemoPeer/widget.
              console.warn("onPeerDisconnect", peer);
              setPeers((ps) =>
                ps.map((p) =>
                  p.peerId === peer.peerId ? { ...p, peer: undefined } : p,
                ),
              );
            }
          },
          onStreamAnnouncement: (rt, peer, announcement) => {
            addAnnouncement(peer, announcement);
            // When a stream is initiated remotely... (TODO).
          },
          onStreamStop: (rt, stream) => {
            // When a stream is stopped, increment that DemoPeer's
            // "streamStopCount". A `useEffect` in the Widget listens for such
            // increments and kills the stream state.
            setPeers((ps) =>
              ps.map((p) =>
                [...(p.peer?.streams.values() ?? [])].some((s) => s === stream)
                  ? { ...p, streamStopCount: p.streamStopCount + 1 }
                  : p,
              ),
            );
          },
          logSink: (level, message) => {
            // Where should log messages from Rainway go?
            consoleLog(level, message);
          },
        });
        setRuntime(rt);
      } finally {
        setConnectingRuntime(false);
      }
    } else {
      rt = runtime;
    }
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
        spellCheck={false}
        size={36}
        value={apiKey}
        disabled={runtime !== undefined || connectingRuntime}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <button
        className="m-l-16"
        disabled={runtime !== undefined || connectingRuntime}
        onClick={connectToRainway}
      >
        Connect to Rainway
      </button>
      {peers.map((p) => (
        <Widget
          key={p.peerId.toString()}
          peer={p.peer}
          peerId={p.peerId}
          chatHistory={p.chatHistory}
          announcements={p.announcements}
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
          spellCheck={false}
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
                await peer.createDataChannel(
                  "Message",
                  RainwayChannelMode.Reliable,
                );

                await peer.listStreams();
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
