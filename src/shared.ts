import { InputLevel, RainwayLogLevel } from "rainway-sdk";

export let config: any = {};
try {
  config = require("../local-config.json");
} catch (e) {}

export const allInput =
  InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

export const isDesktopSafari =
  /Macintosh;.*Safari/.test(navigator.userAgent) &&
  !/Chrome|Android/i.test(navigator.userAgent);

export enum SandboxState {
  Disconnected,
  ConnectingToRelay,
  ConnectedToRelay,
}

export enum SandboxWidgetState {
  Disconnected,
  ConnectingToHost,
  ConnectedToHostNoStream,
  ConnectedToHostReadyToStream,
  ConnectedToHostStreaming,
}

export const consoleLog = (level: RainwayLogLevel, message: string): void => {
  if (level >= RainwayLogLevel.Error) {
    console.error(message);
  } else if (level >= RainwayLogLevel.Warning) {
    console.warn(message);
  } else if (level >= RainwayLogLevel.Information) {
    console.info(message);
  } else {
    console.log(message);
  }
};

export interface Chat {
  type: "incoming" | "outgoing" | "info";
  message: string;
}
