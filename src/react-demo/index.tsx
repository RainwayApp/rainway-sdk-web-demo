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

ReactDOM.render(
  <React.StrictMode>
    <header>
      <Logo />
      <h1 className="m-l-8">
        Rainway SDK <span style={{ fontWeight: "normal" }}>Web Demo</span>
      </h1>
      <div className="build-notes">
        <div className="build-note">
          <Clock />
          Built at {__BUILD_DATE__}
        </div>
        <div className="build-note">
          <History />
          Commit {__BUILD_COMMIT__}
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
