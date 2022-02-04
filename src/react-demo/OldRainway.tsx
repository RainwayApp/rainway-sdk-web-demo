import { RainwayStream } from "rainway-sdk";
import React from "react";
import { useEffect, useRef } from "react";

export interface RainwayProps {
  stream: RainwayStream | undefined;
  style?: React.CSSProperties;
}

/// A React component wrapping a Rainway stream.
///
/// When the `stream` prop is set to a RainwayStream object, its stream
/// container is rendered inside the component.
///
/// When the `stream` prop is `undefined`, this component's children are
/// rendered instead as a fallback:
///
/// ```jsx
/// <Rainway stream={currentStream}>
///   No active stream.
/// </Rainway>
/// ```
///
/// The `style` prop may be used to style this component.

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
    };
  }, [stream]);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        ...props.style,
      }}
      ref={containerRef}
    >
      {props.stream ? undefined : props.children}
    </div>
  );
};
