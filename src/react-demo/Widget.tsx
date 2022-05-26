import {
  InputLevel,
  RainwayPeer,
  RainwayStream,
  RainwayStreamAnnouncement,
} from "rainway-sdk";
import React, { useEffect, useState } from "react";
import { Rainway } from "rainway-react";
import { SendArrow } from "./icons/SendArrow";
import { Chat } from "shared";
import { StreamSelector } from "./StreamSelector";

export interface WidgetProps {
  peerId: bigint;
  chatHistory: Chat[];
  peer: RainwayPeer | undefined;
  announcements: RainwayStreamAnnouncement[];
  sendChat: (message: string) => void;
  disconnect: () => void;
  streamStopCount: number;
}

/// A single widget in the demo app, exposing an interactive interface to a
/// Rainway peer-to-peer connection. The user can chat and request streams.
export const Widget = (props: WidgetProps) => {
  const offline = props.peer === undefined;

  const [chatBuffer, setChatBuffer] = useState("");
  const sendChat = () => {
    props.sendChat(chatBuffer);
    setChatBuffer("");
  };

  const [requestingStream, setRequestingStream] = useState(false);
  const [stream, setStream] = useState<RainwayStream | undefined>();
  const toggleStream = async () => {
    if (stream) {
      stream.leave();
      setStream(undefined);
      return;
    }
    try {
      setRequestingStream(true);
      const result = await props.peer?.requestStream(
        InputLevel.Gamepad | InputLevel.Mouse | InputLevel.Keyboard,
      );
      setStream(result);
    } catch (e) {
      console.log(e);
    } finally {
      setRequestingStream(false);
    }
  };

  useEffect(() => {
    stream?.leave();
    setStream(undefined);
  }, [props.streamStopCount]);

  return (
    <div className="card widget">
      <div className="card-top">
        <h2>
          <label htmlFor="peerId">Peer ID</label>
        </h2>
        <input
          id="peerId"
          type="text"
          spellCheck={false}
          value={props.peerId.toString()}
          disabled={true}
        />
        <div style={{ width: 110 }}>
          {offline ? (
            <div className="badge">Disconnected</div>
          ) : (
            <div className="badge ok">Connected</div>
          )}
        </div>
        <button onClick={() => props.disconnect()}>
          {offline ? "Close" : "Disconnect"}
        </button>
        <button
          disabled={!props.peer || !stream}
          onClick={() => stream?.requestFullscreen()}
        >
          Fullscreen
        </button>
        <button
          disabled={!props.peer || requestingStream}
          onClick={() => toggleStream()}
        >
          {stream ? "Leave Stream" : "Request Stream"}
        </button>
        <StreamSelector
          announcements={props.announcements}
          onChosen={async (announcement) => {
            const stream = await announcement.join();

            console.log(`Joining stream ${stream.streamId}`);
            setStream(stream);
          }}
        />
      </div>
      <div className="widget-body">
        <div className="stream-column m-r-16">
          <div className="stream-wrapper">
            <Rainway stream={stream}>No stream.</Rainway>
          </div>
        </div>
        <div className="chat-column">
          <div className="chat-history m-t-16">
            {props.chatHistory.map((c, i) => (
              <p key={i}>
                <b>{c.type}</b>: {c.message}
              </p>
            ))}
          </div>
          <div className="chat-bottom">
            <input
              disabled={offline}
              className="chat-input"
              type="text"
              placeholder="Enter your message here"
              value={chatBuffer}
              onChange={(e) => setChatBuffer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button
              disabled={offline || !chatBuffer}
              className="chat-send-button"
              type="submit"
              onClick={sendChat}
            >
              <SendArrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
