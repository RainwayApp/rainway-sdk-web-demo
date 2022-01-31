import { InputLevel, RainwayPeer, RainwayStream } from "rainway-sdk";
import React from "react";
import { useState } from "react";
import { Rainway } from "./rainway";

export interface Chat {
  type: "incoming" | "outgoing" | "info";
  message: string;
}

export interface WidgetProps {
  peerId: bigint;
  chatHistory: Chat[];
  peer: RainwayPeer | undefined;
  sendChat: (message: string) => void;
  disconnect: () => void;
}

export const Widget = (props: WidgetProps) => {
  const offline = props.peer === undefined;

  const [chatBuffer, setChatBuffer] = useState("");
  const sendChat = () => {
    props.sendChat(chatBuffer);
    setChatBuffer("");
  };

  const [requestingStream, setRequestingStream] = useState(false);
  const [stream, setStream] = useState<RainwayStream | undefined>();
  const requestStream = async () => {
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

  return (
    <div className="widget">
      <div className="widget-header">
        Peer Id: {props.peerId}
        <br />
        <button onClick={() => props.disconnect()}>Disconnect</button>
        <button disabled={!props.peer || !stream}>Fullscreen</button>
        <button
          disabled={!props.peer || !!stream || requestingStream}
          onClick={() => requestStream()}
        >
          Request Stream
        </button>
      </div>
      <div className="widget-body">
        <div className="stream-column">
          <div style={{ width: 800, height: 600, background: "#ccccdd" }}>
            <Rainway stream={stream} />
          </div>
        </div>
        <div className="chat-column">
          <div className="chat-history">
            {props.chatHistory.map((c, i) => (
              <p key={i}>
                {c.type}: {c.message}
              </p>
            ))}
          </div>
          <div className="chat-bottom">
            <input
              disabled={offline}
              className="chat-input"
              type="text"
              value={chatBuffer}
              onChange={(e) => setChatBuffer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button
              disabled={offline}
              className="chat-send-button"
              type="submit"
              onClick={sendChat}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
