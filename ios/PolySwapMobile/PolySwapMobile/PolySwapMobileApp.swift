import SwiftUI

@main
struct PolySwapMobileApp: App {
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
        }
    }
}
