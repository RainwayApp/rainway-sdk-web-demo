import { StreamSandbox } from "sandbox";
import "style.css";

const ss = new StreamSandbox(
    Number(new URLSearchParams(window.location.search).get("widgets") ?? "1"),
);
