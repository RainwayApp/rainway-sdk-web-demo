# Rainway SDK Web Runtime Demo
Sandbox/example app to be used for testing and experimenting with the Rainway SDK.

Check out our documentation at https://docs.rainway.com.

To get started:

1. Install deps `yarn`
2. Copy `local-config.example.json` to `local-config.json` and modify appropriately. The `apiKey` property is required, you can enter it on the page to save it to localStorage if you prefer.
   * The values for `minimumLogLevel` range from 0 (log everything) to 6 (log nothing). See RainwayLogLevel in the SDK docs.
3. Run `yarn run dev` to launch a dev server. Now go to `http://localhost:4443` in your browser.

Or 

Visit the hosted version [here](https://sdk-builds.rainway.com/demos/web/sandbox/).
