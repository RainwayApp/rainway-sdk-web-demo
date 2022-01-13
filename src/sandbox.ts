import {
    RainwayPeer,
    RainwayStream,
    RainwayError,
    RainwayLogLevel,
    RainwayRuntime,
    InputLevel,
} from "rainway-sdk";
import { consoleLog } from "shared";

let config: any = {};
try {
    config = require("../local-config.json");
} catch (e) {}

let sandboxApiKey = localStorage.getItem("api-key") || config.apiKey || "NO_KEY";
const allInput = InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

const isDesktopSafari =
    /Macintosh;.*Safari/.test(navigator.userAgent) &&
    !/Chrome|Android/i.test(navigator.userAgent);

enum SandboxState {
    Disconnected,
    ConnectingToRelay,
    ConnectedToRelay,
}

enum SandboxWidgetState {
    Disconnected,
    ConnectingToHost,
    ConnectedToHostNoStream,
    ConnectedToHostReadyToStream,
    ConnectedToHostStreaming,
}

class StreamWidget {
    peer: RainwayPeer | undefined;
    stream: RainwayStream | undefined;
    state: SandboxWidgetState = SandboxWidgetState.Disconnected;
    peerId: HTMLInputElement;
    fullscreenButton: HTMLButtonElement;
    pauseButton: HTMLButtonElement;
    statsButton: HTMLButtonElement;
    chatHistory: HTMLDivElement;
    chatInput: HTMLInputElement;
    chatSendButton: HTMLButtonElement;
    

    private getElement = <T extends HTMLElement>(className: string) =>
        document.querySelector(`.${this.widgetClassName} .${className}`)! as T;

    constructor(private runtime: RainwayRuntime, private widgetClassName: string) {
        // Bind some DOM elements and set up listeners

        this.peerId = this.getElement("peer-id");
        this.fullscreenButton = this.getElement("fullscreen-button");
        this.pauseButton = this.getElement("pause-button");
        this.statsButton = this.getElement("stats-button");
        this.chatHistory = this.getElement("chat-history");
        this.chatInput = this.getElement("chat-input");
        this.chatSendButton = this.getElement("chat-send-button");

        this.fullscreenButton.addEventListener("click", () => {
            this.stream?.requestFullscreen();
        });
        this.statsButton.addEventListener("click", () => {
            if (this.statsButton.innerText === "Show stats") {
                this.stream?.enableVideoStatsOverlay();
                this.statsButton.innerText = "Hide stats";
            } else {
                this.stream?.disableVideoStatsOverlay();
                this.statsButton.innerText = "Show stats";
            }
        });
        this.pauseButton.addEventListener("click", () => {
            if (this.pauseButton.innerText === "Pause") {
                this.stream?.pause();
                this.pauseButton.innerText = "Play";
            } else {
                this.stream?.play();
                this.pauseButton.innerText = "Pause";
            }
        });

        this.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.chatSendButton.click();
        });
        this.chatSendButton.addEventListener("click", () => {
            this.sendChatMessage(this.chatInput.value);
        });

        const startStreamButton = this.getElement("start-stream-button");
        const stopStreamButton = this.getElement("stop-stream-button");
        startStreamButton.addEventListener("click", async () => {
            if (this.peer === undefined) throw new RainwayError("no peer to stream");
            const stream = await this.peer.requestStream(allInput);
            this.stream = stream;
            this.setUIState(SandboxWidgetState.ConnectedToHostStreaming);
            this.getElement("stream-wrapper")?.appendChild(stream.container);
            console.log(stream);
        });
        stopStreamButton.addEventListener("click", () => {
            this.stream?.leave();
        });

        // Populate peerId from config, then localStorage, and finally default to "000000000000000000"
        this.peerId.value =
            config.peerId ??
            localStorage.getItem("peer-id-" + widgetClassName) ??
            "000000000000000000";

        // Persist peerId to localStorage for convenience
        this.peerId.addEventListener("change", () => {
            localStorage.setItem("peer-id-" + widgetClassName, this.peerId.value);
        });

        this.getElement("connect-to-host-button").addEventListener("click", (e) =>
            this.connectToHost(),
        );
        this.getElement("disconnect-from-host-button").addEventListener("click", (e) =>
            this.disconnectFromHost(),
        );
        this.setUIState(SandboxWidgetState.Disconnected);
    }

    /** Send UTF-8 encoded message to peer over arbitrary messaging channel and display in the chatbox. */
    private sendChatMessage(message: string): void {
        if (this.peer) {
            this.peer.send(new TextEncoder().encode(message));
            this.displayChatMessage("You", message);
            this.chatInput.value = "";
        }
    }

    /** Add a message to the chatbox element. */
    public displayChatMessage(speaker: string, message: string): void {
        const p = document.createElement("p");
        const span = document.createElement("span");
        span.appendChild(document.createTextNode(speaker + ":"));
        p.appendChild(span);
        p.appendChild(document.createTextNode("\u00a0" + message));
        this.chatHistory.appendChild(p);
    }

    /** Add an "info" message to the chatbox. */
    private displayChatInfo(message: string): void {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(message));
        p.className = "chat-info";
        this.chatHistory.appendChild(p);
    }

    private enableInputs(className: string, enabled: boolean) {
        const a = document.querySelectorAll(`.${this.widgetClassName} .${className}`);
        for (let i = 0; i < a.length; i++) {
            (a[i] as HTMLInputElement).disabled = !enabled;
        }
    }

    /** Short version of peerId. */
    public hostNickname(): string {
        return this.peerId.value.substring(29);
    }

    private showError(e: any): void {
        const error = String(e).replace(/^(.*Error: )+/, "");
        this.getElement("rainway-client-state")!.innerText = error;
    }

    /** Connect to a stream hosting-capable peer. Will connect parent runtime to instant relay first if not connected. */
    async connectToHost(): Promise<void> {
        if (this.runtime === undefined) throw new Error();
        await this.runtime.connectToGateway();

        this.setUIState(SandboxWidgetState.ConnectingToHost);
        try {
            this.peer = await this.runtime.connect(BigInt(this.peerId.value));
        } catch (e) {
            this.setUIState(SandboxWidgetState.Disconnected);
            this.showError(e);
            return;
        }
        this.setUIState(SandboxWidgetState.ConnectedToHostNoStream);
        this.displayChatInfo(`Connected to ${this.hostNickname()}. Say hi!`);

        await this.peer.readyToStream;
        this.setUIState(SandboxWidgetState.ConnectedToHostReadyToStream);
        this.displayChatInfo("Ready to stream.");
    }

    /** Disconnect from peer or cancel connection attempt in progress. */
    async disconnectFromHost(): Promise<void> {
        if (this.runtime === undefined) throw new Error();

        this.setUIState(SandboxWidgetState.Disconnected);
        if (this.peer === undefined) {
            this.runtime.cancelConnectionAttempt(BigInt(this.peerId.value));
            return;
        }
        this.peer.disconnect();
    }

    /** Set new state and update UI appropriately. */
    public setUIState(newState: SandboxWidgetState) {
        const S = SandboxWidgetState;
        const descriptions = {
            [S.Disconnected]: "Disconnected",
            [S.ConnectingToHost]: "Connecting to host...",
            [S.ConnectedToHostNoStream]: "Connected (preparing stream...)",
            [S.ConnectedToHostReadyToStream]: "Connected (ready to stream)",
            [S.ConnectedToHostStreaming]: "Streaming",
        };
        this.getElement("rainway-client-state")!.innerText = descriptions[newState];

        this.enableInputs("when-no-host", newState === S.Disconnected);
        this.enableInputs("when-host-or-connecting", newState >= S.ConnectingToHost);
        this.enableInputs("when-host", newState >= S.ConnectedToHostNoStream);
        this.enableInputs("when-ready-to-stream", newState === S.ConnectedToHostReadyToStream);
        this.enableInputs("when-streaming", newState >= S.ConnectedToHostStreaming);

        this.state = newState;
    }
}

export class StreamSandbox {
    runtime: RainwayRuntime | undefined;
    logVideoStats: boolean;
    logTransportStats: boolean;
    minimumLogLevel: RainwayLogLevel;
    rainwayLogsInConsole: boolean;
    state: SandboxState = SandboxState.Disconnected;

    widgets: StreamWidget[] = [];

    private querySelector = <T extends HTMLElement>(query: string) =>
        document.querySelector(query)! as T;

    /**
     * Construct a sandbox with a number of widgets. Each widget can host a stream from a different peer.
     * Populated from url query param by default */
    constructor(private numWidgets: number) {
        const template = this.querySelector<HTMLTemplateElement>("template.widget");
        const templateDiv = template.content.firstElementChild!;
        for (let i = 1; i <= this.numWidgets; i++) {
            const w = templateDiv.cloneNode(true) as HTMLDivElement;
            w.className = `widget widget${i}`;
            this.querySelector(".widgets").appendChild(w);
        }
        ;(this.querySelector(".api-key") as HTMLInputElement).value = sandboxApiKey
        this.querySelector(".api-key").addEventListener("change", (event) => {
            localStorage.setItem("api-key", (event.target as HTMLInputElement).value)
            sandboxApiKey = (event.target as HTMLInputElement).value
        })

        this.querySelector(".connect-to-relay-button").addEventListener("click", () =>
            this.connectToRelay(),
        );
        this.querySelector(".disconnect-from-relay-button").addEventListener("click", () =>
            this.disconnectFromRelay(),
        );

        this.runtime = undefined;
        let config: any = {};
        try {
            config = require("../local-config.json");
        } catch (e) {}
        this.minimumLogLevel = config.minimumLogLevel ?? RainwayLogLevel.Debug;
        this.logVideoStats = config.logVideoStats ?? false;
        this.logTransportStats = config.logTransportStats ?? false;
        this.rainwayLogsInConsole = config.rainwayLogsInConsole ?? true;
    }

    private handleLog = (level: RainwayLogLevel, message: string): void => {
        if (level >= this.minimumLogLevel) {
            consoleLog(level, message);
        }
    };

    private enableInputs(className: string, enabled: boolean) {
        const a = document.querySelectorAll("." + className);
        for (let i = 0; i < a.length; i++) {
            (a[i] as HTMLInputElement).disabled = !enabled;
        }
    }

    /** Instantiate runtime if not yet built, connect it to instant relay. */
    async connectToRelay(): Promise<void> {
        // Make and attach the Rainway client.
        this.setUIState(SandboxState.ConnectingToRelay);
        if (!this.runtime) {
            this.runtime = await RainwayRuntime.initialize({
                apiKey: sandboxApiKey,
                externalId: "web-sdk-demo-sandbox",
                // Listener for instant relay connection loss
                onRuntimeConnectionLost: (error) => {
                    console.log("Connection lost:", error);
                    this.setUIState(SandboxState.Disconnected);
                },
                // Listener for incoming connection requests
                onConnectionRequest: (request) => {
                    // Auto-accept every request.
                    request.accept();
                },
                // Listener for incoming arbitrary messages
                onPeerMessage: (peer, data) => {
                    // the only arbitrary messages we're listening for are basic chat messages
                    const w = this.widgets.find((w) => w.peer === peer);
                    if (w === undefined) return;
                    w.displayChatMessage(w.hostNickname(), new TextDecoder().decode(data));
                },
                // Listener for errors from particular peers
                onPeerError: (peer, error) => {},
                // Listener for when a peer finishes connecting
                onPeerConnect: (peer) => {},
                // Listener for peer disconnect
                onPeerDisconnect: (peer) => {
                    // remove appropriate stream container when a peer disconnects
                    const w = this.widgets.find((w) => w.peer === peer);
                    if (w === undefined) return;
                    w.peer = undefined;
                    if (w.state > SandboxWidgetState.Disconnected) {
                        w.setUIState(SandboxWidgetState.Disconnected);
                    }
                    if (w.stream !== undefined) w.stream.container.remove();
                },
                // Listener for peer stream announcement. Hosts can announce streams to clients.
                // Don't do anything when a peer announces a stream (currently)
                onStreamAnnouncement: (peer, announcement) => {},
                // Listener for stream stop
                onStreamStop: (stream) => {
                    // When the stream stops, remove the container from the DOM
                    const w = this.widgets.find((w) => w.peer?.stream === stream);
                    if (w === undefined) return;
                    stream.container.remove();
                    if (w.state > SandboxWidgetState.ConnectedToHostReadyToStream) {
                        w.setUIState(SandboxWidgetState.ConnectedToHostReadyToStream);
                    }
                },
                // logSink is just a function that accepts a loglevel and a string
                // all internal SDK logs will be sent there
                logSink: this.handleLog.bind(this),
            });
        }
        // This call is not strictly necessary if the runtime was just constructed:
        await this.runtime.connectToGateway();
        // The runtime automatically connects to instant relay when initialized.
        this.setUIState(SandboxState.ConnectedToRelay);
        if (this.widgets.length === 0) {
            for (let i = 1; i <= this.numWidgets; i++) {
                this.widgets.push(new StreamWidget(this.runtime, `widget${i}`));
                this.querySelector(`.widget${i}`).hidden = false;
            }
        }
    }

    /** Set state and update UI appropriately. */
    private setUIState(newState: SandboxState) {
        const S = SandboxState;
        const descriptions = {
            [S.Disconnected]: "Disconnected",
            [S.ConnectingToRelay]: "Connecting...",
            [S.ConnectedToRelay]: "Connected to Gateway as " + this.runtime?.getPeerId(),
        };
        this.querySelector(".rainway-outer-state")!.innerText = descriptions[newState];

        this.enableInputs("when-no-relay", newState === S.Disconnected);
        this.enableInputs("when-relay", newState >= S.ConnectedToRelay);

        this.state = newState;
    }

    /** Disconnect from instant relay. Runtime can be reconnected later. */
    async disconnectFromRelay() {
        this.runtime?.disconnectFromGateway();
        this.setUIState(SandboxState.Disconnected);
    }
}
