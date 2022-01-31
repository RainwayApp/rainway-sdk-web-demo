import { RainwayStream } from "rainway-sdk";
import React from "react";
import { useEffect, useRef } from "react";

interface RainwayProps {
  stream: RainwayStream | undefined;
}
export const Rainway: React.FC<RainwayProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stream = props.stream;
  useEffect(() => {
    if (props.stream) {
      containerRef.current!.appendChild(props.stream.container);
    }
    return () => {
      if (props.stream)
        containerRef.current?.removeChild(props.stream.container);
      stream?.leave();
    };
  }, [stream]);
  return <div ref={containerRef}>{props.stream ? "" : "Loading…"}</div>;
};
