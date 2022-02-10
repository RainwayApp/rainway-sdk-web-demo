# Rainway Web SDK React demo

Try it [here](https://rainwayapp.github.io/rainway-sdk-web-demo)!

This is an example application that you can use both as a reference for how to integrate Rainway into your React application, and to give Rainway a try before you start developing with it.

## Usage

You'll need [an API key](https://hub.rainway.com/keys) and a [host demo app](https://github.com/RainwayApp/rainway-sdk-csharp-examples) running on some Windows 10 PC.

Enter your API key in the Web demo, click _Connect to Rainway_, then connect to your host app's Peer ID.

A widget will pop up that you can use to request a stream (of the remote desktop, or the isolated app chosen by the host).

## Project structure

`Demo.tsx` defines the component for the full app, which manages the
RainwayRuntime instance. It renders zero or more `Widget.tsx` components, each
managing a Rainway peer-to-peer connection.
