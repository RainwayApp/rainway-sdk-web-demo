import { PeerState, RainwayConnection } from "@rainway/web";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import useAsyncEffect from "use-async-effect";

const QuickDemo = () => {
  const [runtime, setRuntime] = useState<RainwayConnection | undefined>();
  const [error, setError] = useState<string>("");
  useAsyncEffect(async (isAlive) => {
    try {
      let rt = await RainwayConnection.initialize({
        apiKey:
          new URLSearchParams(window.location.search).get("api_key") ?? "",
        externalId: "web-demo-react",
      });

      rt.addEventListener("close", (err) => {
        // if the rainway connection closes, something is wrong
        console.error(`Lost connection to Rainway: ${err}`);
      });

      rt.addEventListener("peer", async (req) => {
        // Accept all requests to connect to us, since we're a demo app
        const peer = await req.accept();

        peer.addEventListener("connectionstatechanged", (state) => {
          // log all peer state changes
          console.log(
            `Peer ${peer.peerId} changed state to ${PeerState[state]}`,
          );
        });
      });
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
