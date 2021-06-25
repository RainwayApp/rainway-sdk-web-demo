import { StreamSandbox } from "sandbox";

const ss = new StreamSandbox(
    Number(new URLSearchParams(window.location.search).get("widgets") ?? "1"),
);
