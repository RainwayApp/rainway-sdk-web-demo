import { InputLevel, RainwayLogLevel } from "@rainway/web";

export const allInput =
  InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

export const isDesktopSafari =
  /Macintosh;.*Safari/.test(navigator.userAgent) &&
  !/Chrome|Android/i.test(navigator.userAgent);

export const consoleLog = (level: RainwayLogLevel, message: string): void => {
  if (level >= RainwayLogLevel.Error) {
    console.error(message);
  } else if (level >= RainwayLogLevel.Warning) {
    console.warn(message);
  } else if (level >= RainwayLogLevel.Information) {
    console.info(message);
  } else {
    console.log(`[${RainwayLogLevel[level]}] ${message}`);
  }
};

export interface Chat {
  type: "incoming" | "outgoing" | "info";
  message: string;
}
