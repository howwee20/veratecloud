import SwiftUI
import WebKit

struct ContentView: View {
    @EnvironmentObject private var cloud: CloudPlaybackStore
    @EnvironmentObject private var player: MusicPlaybackController

    var body: some View {
        PolySwapWebView(cloud: cloud, player: player)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

private struct PolySwapWebView: UIViewRepresentable {
    let cloud: CloudPlaybackStore
    let player: MusicPlaybackController

    func makeCoordinator() -> Coordinator {
        Coordinator(cloud: cloud, player: player)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(context.coordinator, name: "polyswapNative")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.allowsBackForwardNavigationGestures = false
        webView.customUserAgent = "PolySwap-iPhone/0.3"
        webView.load(URLRequest(url: URL(string: "https://polyswap.ai/mobile.html?native=1")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler {
        private let cloud: CloudPlaybackStore
        private let player: MusicPlaybackController

        init(cloud: CloudPlaybackStore, player: MusicPlaybackController) {
            self.cloud = cloud
            self.player = player
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame,
                  message.frameInfo.request.url?.scheme == "https",
                  message.frameInfo.request.url?.host == "polyswap.ai",
                  message.name == "polyswapNative",
                  let body = message.body as? [String: Any],
                  body["type"] as? String == "connect",
                  let sessionId = body["sessionId"] as? String,
                  let accessToken = body["accessToken"] as? String else { return }

            Task { @MainActor in
                await cloud.connect(sessionId: sessionId, accessToken: accessToken, player: player)
            }
        }
    }
}
