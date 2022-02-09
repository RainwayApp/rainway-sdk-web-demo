import { RainwayRuntime } from "rainway-sdk";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import useAsyncEffect from "use-async-effect";

const QuickDemo = () => {
  const [runtime, setRuntime] = useState<RainwayRuntime | undefined>();
  const [error, setError] = useState<string>("");
  useAsyncEffect(async (isAlive) => {
    try {
      const rt = await RainwayRuntime.initialize({
        apiKey: "TODO",
        externalId: "web-demo-quick",
        onRuntimeConnectionLost: (error) => {
          setRuntime(undefined);
        },
        onConnectionRequest: (request) => {
          request.accept();
        },
        onPeerMessage: () => {},
        onPeerDataChannel: () => {},
        onPeerError: (peer, error) => {
          console.warn("onPeerError", peer, error);
        },
        onPeerConnect: (peer) => {
          console.log("onPeerConnect", peer);
        },
        onPeerDisconnect: (peer) => {
          console.log("onPeerDisconnect", peer);
        },
        onStreamAnnouncement: () => {},
        onStreamStop: () => {},
        logSink: () => {},
      });
      if (!isAlive()) return;
      setRuntime(rt);
    } catch (e) {
      setError((e as Error).message);
      console.log(e);
    }
  });
  return (
    <main className="m-t-8 m-l-8 m-r-8 m-b-8">
      {error ? error : runtime ? "Connected." : "Connecting…"}
    </main>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <QuickDemo />
  </React.StrictMode>,
  document.getElementById("react-root"),
);
