import { InputLevel, LogLevel } from "@rainway/web";

export const allInput =
  InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

export const isDesktopSafari =
  /Macintosh;.*Safari/.test(navigator.userAgent) &&
  !/Chrome|Android/i.test(navigator.userAgent);

export const consoleLog = (level: LogLevel, message: string): void => {
  switch (level) {
    case LogLevel.Debug:
      console.debug(message);
      break;
    case LogLevel.Error:
      console.error(message);
      break;
    case LogLevel.Info:
      console.info(message);
      break;
    case LogLevel.Trace:
      console.trace(message);
      break;
    case LogLevel.Warning:
      console.warn(message);
      break;
    default:
      console.log(`${LogLevel[level]} ${message}`);
  }
};

export interface Chat {
  type: "incoming" | "outgoing" | "info";
  message: string;
}
