import { InputLevel, LogLevel } from "@rainway/web";

export const allInput =
  InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

export const isDesktopSafari =
  /Macintosh;.*Safari/.test(navigator.userAgent) &&
  !/Chrome|Android/i.test(navigator.userAgent);

export const consoleLog = (level: LogLevel, message: string): void => {
  if (level >= LogLevel.Error) {
    console.error(message);
  } else if (level >= LogLevel.Warning) {
    console.warn(message);
  } else if (level >= LogLevel.Info) {
    console.info(message);
  } else {
    console.log(`[${LogLevel[level]}] ${message}`);
  }
};

export interface Chat {
  type: "incoming" | "outgoing" | "info";
  message: string;
}
