import React from "react";
import ReactDOM from "react-dom";
import "../style.css";
import { Demo } from "./Demo";
import { Clock } from "./icons/Clock";
import { History } from "./icons/History";
import { Logo } from "./icons/Logo";

// Defined using DefinePlugin in webpack.config.ts
declare const __BUILD_DATE__: string;
declare const __BUILD_COMMIT__: string;
declare const __RAINWAY_SDK_VERSION__: string;

function prettyDate(date: Date) {
  return (
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

const sdkHref = `https://www.npmjs.com/package/rainway-sdk/v/${__RAINWAY_SDK_VERSION__}`;

ReactDOM.render(
  <React.StrictMode>
    <header>
      <div className="header-inner">
        <Logo />
        <h1 className="m-l-8">
          Rainway SDK <span style={{ fontWeight: "normal" }}>Web Demo</span>
        </h1>
        <div className="build-notes">
          <div className="build-note">
            <Clock />
            Built on {prettyDate(new Date(__BUILD_DATE__))}
          </div>
          <div className="build-note">
            <History />
            <a href={sdkHref}>Web SDK {__RAINWAY_SDK_VERSION__}</a>
          </div>
        </div>
      </div>
    </header>
    <div className="backdrop" />
    <main>
      <Demo />
    </main>
  </React.StrictMode>,
  document.getElementById("react-root"),
);
