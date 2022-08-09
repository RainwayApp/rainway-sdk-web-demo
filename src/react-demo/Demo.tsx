import React, { useState } from "react";
import "../style.css";
import { useLocalStorage } from "./util";

import rainway, {
  DataChannel,
  DataChannelMode,
  LogLevel,
  Peer,
  PeerState,
  RainwayConnection,
  RainwayStreamAnnouncement,
} from "@rainway/web";

import { Chat, consoleLog } from "../shared";
import { Widget } from "./Widget";

/// A peer with some data relevant to the demo app tacked on.
interface DemoPeer {
  peerId: bigint;
  peer: Peer | undefined;
  announcements: RainwayStreamAnnouncement[];
  chatHistory: Chat[];
  streamStopCount: number;
}

/// Make a new DemoPeer from a RainwayPeer.
function makePeer(peer: Peer): DemoPeer {
  return {
    peer,
    peerId: peer.id,
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
  const [runtime, setRuntime] = useState<RainwayConnection | undefined>();
  const [peers, setPeers] = useState<DemoPeer[]>([]);

  function addChat(peer: Peer, chat: Chat) {
    setPeers((ps) =>
      ps.map((p) =>
        p.peerId === peer.id
          ? { ...p, chatHistory: [...p.chatHistory, chat] }
          : p,
      ),
    );
  }

  function addAnnouncement(
    peer: Peer,
    announcement: RainwayStreamAnnouncement,
  ) {
    setPeers((ps) =>
      ps.map((p) =>
        p.peerId === peer.id
          ? { ...p, announcements: [...p.announcements, announcement] }
          : p,
      ),
    );
  }

  // This "peerId" string is the value for the connect prompt.
  const [peerId, setPeerId] = useLocalStorage<string>("peerId-widget1", "");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const setupChannelHandlers = (channel: DataChannel) => {
    channel.addEventListener("message", (msg) => {
      const { data } = msg;
      // Rainway offers arbitrary peer-to-peer data channel communication.
      // In our demo apps, we simply interpret the bytestreams as UTF-8
      // "chat messages" and display them in the right widget:
      const chat: Chat = {
        type: "incoming",
        message: new TextDecoder().decode(data),
      };
      addChat(channel.peer, chat);
    });
  };

  const setupPeerHandlers = (peer: Peer) => {
    peer.addEventListener("close", () => {
      // When a peer connection is lost, remove a DemoPeer/widget.
      setPeers((ps) =>
        ps.map((p) => (p.peerId === peer.id ? { ...p, peer: undefined } : p)),
      );
    });

    peer.addEventListener("datachannel", (channel) => {
      setupChannelHandlers(channel);
    });

    peer.addEventListener("stream-announcement", (announcement) => {
      addAnnouncement(peer, announcement);
    });
  };

  const connectToRainway = async (): Promise<void> => {
    // Make and attach the Rainway client.
    if (!runtime) {
      setConnectingRuntime(true);
      try {
        // forward all rainway logs to `console.log`
        rainway.addEventListener("log", (level, target, message) => {
          consoleLog(level, `${target}: ${message}`);
        });

        let conn = await rainway.connect({
          apiKey,
          externalId: "web-demo-react",
        });

        conn.addEventListener("close", (err) => {
          // if the rainway connection closes, something is wrong
          console.error(`Lost connection to Rainway: ${err}`);
        });

        conn.addEventListener("peer-request", async (req) => {
          // Accept all requests to connect to us, since we're a demo app
          const peer = await req.accept();

          const found = peers.find((p) => p.peerId === peer.id);
          if (!found) {
            setPeers((ps) => [...ps, makePeer(peer)]);
          }

          setupPeerHandlers(peer);
        });

        setRuntime(conn);
      } finally {
        setConnectingRuntime(false);
      }
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
              p.peer.dataChannels.get("Message")?.send(message);
            }
          }}
          disconnect={() => {
            p.peer?.close();
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
                const found = peers.find((p) => p.peerId === peer.id);
                if (!found) {
                  setPeers((ps) => [...ps, makePeer(peer)]);
                }

                setupPeerHandlers(peer);

                const channel = await peer.createDataChannel({
                  id: "Message",
                  mode: DataChannelMode.Reliable,
                });

                setupChannelHandlers(channel);

                await peer.forceStreamAnnouncements();
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
