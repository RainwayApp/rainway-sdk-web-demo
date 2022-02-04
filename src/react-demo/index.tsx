import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../style.css";
import { Demo } from "./Demo";
import { Clock } from "./icons/Clock";
import { History } from "./icons/History";
import { Logo } from "./Logo";

// Defined using DefinePlugin in webpack.config.ts
declare const __BUILD_DATE__: string;
declare const __BUILD_COMMIT__: string;

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
            {/* Commit {__BUILD_COMMIT__} */}
            <a href="https://www.npmjs.com/package/rainway-sdk/v/0.2.3">
              Web SDK 0.2.3
            </a>
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
