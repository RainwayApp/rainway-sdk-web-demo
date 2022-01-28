import {
    RainwayPeer,
    RainwayStream,
    RainwayError,
    RainwayLogLevel,
    RainwayRuntime,
    RainwayChannelMode,
    InputLevel,
} from "rainway-sdk";

let config: any = {};
try {
    config = require("../local-config.json");
} catch (e) {}

let sandboxApiKey = localStorage.getItem("api-key") ?? config.apiKey ?? "NO_KEY";
const allInput = InputLevel.Keyboard | InputLevel.Mouse | InputLevel.Gamepad;

const isDesktopSafari =
    /Macintosh;.*Safari/.test(navigator.userAgent) &&
    !/Chrome|Android/i.test(navigator.userAgent);

enum SandboxState {
    Disconnected,
    ConnectingToGateway,
    ConnectedToGateway,
}

enum SandboxWidgetState {
    Disconnected,
    ConnectingToHost,
    ConnectedToHostNoStream,
    ConnectedToHostCantStream,
    ConnectedToHostReadyToStream,
    ConnectedToHostStreaming,
}

class StreamWidget {
    peer: RainwayPeer | undefined;
    stream: RainwayStream | undefined;
    state: SandboxWidgetState = SandboxWidgetState.Disconnected;
    peerId: HTMLInputElement;
    fullscreenButton: HTMLButtonElement;
    toggleGesturesButton: HTMLButtonElement;
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
        this.toggleGesturesButton = this.getElement("toggle-gestures-button");
        this.pauseButton = this.getElement("pause-button");
        this.statsButton = this.getElement("stats-button");
        this.chatHistory = this.getElement("chat-history");
        this.chatInput = this.getElement("chat-input");
        this.chatSendButton = this.getElement("chat-send-button");

        this.fullscreenButton.addEventListener("click", () => {
            this.stream?.requestFullscreen();
        });
        this.toggleGesturesButton.addEventListener("click", () => {
            if (this.toggleGesturesButton.innerText === "Enable gestures") {
                this.stream?.enableGestures();
                this.toggleGesturesButton.innerText = "Disable gestures";
            } else {
                this.stream?.disableGestures();
                this.toggleGesturesButton.innerText = "Enable gestures";
            }
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

        // Populate peerId from config, then localStorage, and finally default to "555555555123456789"
        this.peerId.value =
            config.peerId ??
            localStorage.getItem("peerId-" + widgetClassName) ??
            "555555555123456789";

        // Persist peerId to localStorage for convenience
        this.peerId.addEventListener("change", () => {
            localStorage.setItem("peerId-" + widgetClassName, this.peerId.value);
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
            this.peer.send("Message", new TextEncoder().encode(message));
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
    public displayChatInfo(message: string): void {
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

    /** Human-readable nickname for this peer. */
    public hostNickname(): string {
        if (!this.peer) return "(no peer)";
        if (!this.peer.externalId) return "(anonymous peer)";
        return this.peer.externalId;
    }

    private showError(e: any): void {
        const error = String(e).replace(/^(.*Error: )+/, "");
        this.getElement("rainway-client-state")!.innerText = error;
    }

    /** Connect to a stream hosting-capable peer. Will connect parent runtime to Gateway first if not connected. */
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
        this.peer.createDataChannel("Message", RainwayChannelMode.Reliable);

        this.setUIState(SandboxWidgetState.ConnectedToHostNoStream);
        this.displayChatInfo(`Connected to "${this.hostNickname()}". Say hi!`);
        await this.awaitReadyToStream();
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
            [S.ConnectedToHostCantStream]: "Connected (peer can't stream)",
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

    public async awaitReadyToStream(): Promise<void> {
        if (!this.peer) return;
        if (await this.peer.readyToStream) {
            this.setUIState(SandboxWidgetState.ConnectedToHostReadyToStream);
            this.displayChatInfo("Ready to stream.");
        } else {
            this.setUIState(SandboxWidgetState.ConnectedToHostCantStream);
            this.displayChatInfo(
                "The remote peer can't stream media. You can still send chat messages back and forth.",
            );
            if (/web/.test(this.peer.externalId)) {
                this.displayChatInfo(
                    "(Did you connect two Web SDK demos? Rainway currently only supports streaming from the Windows 10 Native SDK to a web environment.)",
                );
            }
        }
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

        this.querySelector<HTMLInputElement>(".api-key").value = sandboxApiKey;

        this.querySelector(".api-key").addEventListener("change", (event) => {
            localStorage.setItem("api-key", (event.target as HTMLInputElement).value)
            sandboxApiKey = (event.target as HTMLInputElement).value
        });

        this.querySelector(".connect-to-gateway-button").addEventListener("click", () =>
            this.connectToGateway(),
        );
        this.querySelector(".disconnect-from-gateway-button").addEventListener("click", () =>
            this.disconnectFromGateway(),
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

    private addWidget(): StreamWidget {
        const template = this.querySelector<HTMLTemplateElement>("template.widget");
        const templateDiv = template.content.firstElementChild!;
        const i = ++this.numWidgets;
        const widgetDiv = templateDiv.cloneNode(true) as HTMLDivElement;
        widgetDiv.className = `widget widget${i}`;
        this.querySelector(".widgets").appendChild(widgetDiv);
        const widget = new StreamWidget(this.runtime!, `widget${i}`);
        this.widgets.push(widget);
        this.querySelector(`.widget${i}`).hidden = false;
        return widget;
    }

    /** Log to web console based on Rainway log level. */
    private consoleLog(level: RainwayLogLevel, message: string): void {
        if (level >= RainwayLogLevel.Error) {
            console.error(message);
        } else if (level >= RainwayLogLevel.Warning) {
            console.warn(message);
        } else if (level >= RainwayLogLevel.Information) {
            console.info(message);
        } else {
            console.log(message);
        }
    }

    private handleLog = (level: RainwayLogLevel, message: string): void => {
        if (level >= this.minimumLogLevel) {
            this.consoleLog(level, message);
        }
    };

    private enableInputs(className: string, enabled: boolean) {
        const a = document.querySelectorAll("." + className);
        for (let i = 0; i < a.length; i++) {
            (a[i] as HTMLInputElement).disabled = !enabled;
        }
    }

    /** Instantiate runtime if not yet built, connect it to Gateway. */
    async connectToGateway(): Promise<void> {
        // Make and attach the Rainway client.
        this.setUIState(SandboxState.ConnectingToGateway);
        if (!this.runtime) {
            this.runtime = await RainwayRuntime.initialize({
                apiKey: sandboxApiKey,
                externalId: "web runtime sandbox",
                // Listener for Gateway connection loss
                onRuntimeConnectionLost: (error) => {
                    console.log("Connection lost:", error);
                    this.setUIState(SandboxState.Disconnected);
                },
                // Listener for incoming connection requests
                onConnectionRequest: (request) => {
                    window.confirm(
                        `Connection request from ${request.peerId} (${request.externalId}). Accept it?`,
                    )
                        ? request.accept()
                        : request.reject("Rejected via web sandbox prompt");
                },
                // Listener for incoming arbitrary messages
                onPeerMessage: (peer, channelName, data) => {
                    // the only arbitrary messages we're listening for are basic chat messages
                    const w = this.widgets.find((w) => w.peer === peer);
                    if (w === undefined) return;
                    w.displayChatMessage(w.hostNickname(), new TextDecoder().decode(data));
                },
                // Listener for peer data channel creation
                onPeerDataChannel: (peer, channelName, event) => {},
                // Listener for errors from particular peers
                onPeerError: (peer, error) => {},
                // Listener for when a peer finishes connecting
                onPeerConnect: async (peer) => {
                    console.log("onPeerConnect", peer, this.widgets);

                    // Do nothing if this peer already has a widget:
                    if (
                        this.widgets.some(
                            (w) =>
                                w.peer === peer ||
                                (w.state === SandboxWidgetState.ConnectingToHost &&
                                    w.peerId.value === peer.peerId.toString()),
                        )
                    )
                        return;

                    // Find or create a widget for this peer.
                    const available = this.widgets.find(
                        (w) => w.state === SandboxWidgetState.Disconnected,
                    );
                    const widget = available ?? this.addWidget();
                    widget.peer = peer;
                    widget.peerId.value = peer.peerId.toString();
                    widget.displayChatInfo("Accepted a connection from " + peer.peerId);
                    widget.setUIState(SandboxWidgetState.ConnectedToHostNoStream);
                    await widget.awaitReadyToStream();
                },
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
                    const w = this.widgets.find((w) => w.stream === stream);
                    if (w === undefined) return;
                    stream.container.remove();
                    if (w.state === SandboxWidgetState.ConnectedToHostStreaming) {
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
        // The runtime automatically connects to Gateway when initialized.
        this.setUIState(SandboxState.ConnectedToGateway);
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
            [S.ConnectingToGateway]: "Connecting...",
            [S.ConnectedToGateway]: "Connected to gateway as " + this.runtime?.getPeerId(),
        };
        this.querySelector(".rainway-outer-state")!.innerText = descriptions[newState];

        this.enableInputs("when-no-gateway", newState === S.Disconnected);
        this.enableInputs("when-gateway", newState >= S.ConnectedToGateway);

        this.state = newState;
    }

    /** Disconnect from Gateway. Runtime can be reconnected later. */
    async disconnectFromGateway() {
        this.runtime?.disconnectFromGateway();
        this.setUIState(SandboxState.Disconnected);
    }
}
