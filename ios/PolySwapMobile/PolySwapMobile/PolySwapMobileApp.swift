import SwiftUI

@main
struct PolySwapMobileApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var cloud = CloudPlaybackStore()
    @StateObject private var player = MusicPlaybackController()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(cloud)
                .environmentObject(player)
                .task {
                    await cloud.start(player: player)
                }
                .onChange(of: scenePhase) { _, phase in
                    guard phase == .active else { return }
                    Task { await cloud.becameActive() }
                }
        }
    }
}
