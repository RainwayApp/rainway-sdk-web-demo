import { InputLevel, RainwayPeer, RainwayStream } from "rainway-sdk";
import React from "react";
import { useState } from "react";
import { Rainway } from "rainway-react";

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

const SendArrow = () => (
  <svg
    width="16"
    height="14"
    viewBox="0 0 16 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.293 0.293C8.48053 0.105529 8.73484 0.000213623 9 0.000213623C9.26516 0.000213623 9.51947 0.105529 9.707 0.293L15.707 6.293C15.8945 6.48053 15.9998 6.73484 15.9998 7C15.9998 7.26516 15.8945 7.51947 15.707 7.707L9.707 13.707C9.5184 13.8892 9.2658 13.99 9.0036 13.9877C8.7414 13.9854 8.49059 13.8802 8.30518 13.6948C8.11977 13.5094 8.0146 13.2586 8.01233 12.9964C8.01005 12.7342 8.11084 12.4816 8.293 12.293L12.586 8H1C0.734784 8 0.48043 7.89464 0.292893 7.70711C0.105357 7.51957 0 7.26522 0 7C0 6.73478 0.105357 6.48043 0.292893 6.29289C0.48043 6.10536 0.734784 6 1 6H12.586L8.293 1.707C8.10553 1.51947 8.00021 1.26516 8.00021 1C8.00021 0.734836 8.10553 0.480528 8.293 0.293Z"
      fill="#616ACB"
    />
  </svg>
);

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
    <div className="card widget">
      <div className="m-b-8 flex">
        <h2>
          <label htmlFor="peerId">Peer ID</label>
        </h2>
        <input
          className="m-l-8"
          id="peerId"
          type="text"
          value={props.peerId.toString()}
          disabled={true}
        />
        <button className="m-l-8" onClick={() => props.disconnect()}>
          Disconnect
        </button>
        <button className="m-l-8" disabled={!props.peer || !stream}>
          Fullscreen
        </button>
        <button
          className="m-l-8"
          disabled={!props.peer || !!stream || requestingStream}
          onClick={() => requestStream()}
        >
          Request Stream
        </button>
      </div>
      <div className="widget-body">
        <div className="stream-column m-r-16">
          <div className="stream-wrapper">
            <Rainway stream={stream}>No stream.</Rainway>
          </div>
        </div>
        <div className="chat-column">
          {/* <h2>Chat</h2> */}
          <div className="chat-history m-t-16">
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
