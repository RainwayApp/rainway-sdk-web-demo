import { RainwayRuntime } from "@rainway/web";
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
        apiKey:
          new URLSearchParams(window.location.search).get("api_key") ?? "",
        externalId: "web-demo-quick",
        onRuntimeConnectionLost: (rt, error) => {
          setRuntime(undefined);
        },
        onConnectionRequest: (rt, request) => {
          request.accept();
        },
        onPeerMessage: () => {},
        onPeerDataChannel: () => {},
        onPeerError: (rt, peer, error) => {
          console.warn("onPeerError", peer, error);
        },
        onPeerStateChange: (rt, peer, state) => {
          console.log(`Peer ${peer.peerId} changed states to ${state}`);
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
