import { InputLevel } from "rainway-sdk";

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
