import AVFAudio
import MusicKit

@MainActor
final class MusicPlaybackController: ObservableObject {
    @Published private(set) var status = "ready"
    @Published private(set) var nowPlaying = "Nothing playing"
    @Published private(set) var lastError = ""
    private(set) var appliedRevision = 0

    private let player = ApplicationMusicPlayer.shared
    private var prepared = false

    func prepare() async {
        guard !prepared else { return }
        do {
            let authorization = await MusicAuthorization.request()
            guard authorization == .authorized else {
                status = "permission-needed"
                lastError = "Allow Apple Music access to play in the background."
                return
            }
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            prepared = true
            status = "ready"
            lastError = ""
        } catch {
            status = "error"
            lastError = error.localizedDescription
        }
    }

    func apply(_ cloud: PlaybackSession) async throws {
        guard cloud.revision > appliedRevision else { return }
        await prepare()
        guard prepared else { return }
        do {
            switch cloud.lastCommand {
            case "track":
                try await play(query: cloud.requestedQuery)
            case "pause":
                player.pause()
                status = "paused"
            case "resume":
                try await player.play()
                status = "playing"
            case "stop":
                player.stop()
                status = "stopped"
            case "next":
                try await player.skipToNextEntry()
                status = "playing"
            case "previous":
                try await player.skipToPreviousEntry()
                status = "playing"
            default:
                break
            }
            appliedRevision = cloud.revision
            lastError = ""
        } catch {
            status = "error"
            lastError = error.localizedDescription
            throw error
        }
    }

    private func play(query: String) async throws {
        guard !query.isEmpty else { return }
        var search = MusicCatalogSearchRequest(term: query, types: [Song.self])
        search.limit = 10
        let response = try await search.response()
        guard let song = response.songs.first else {
            throw NSError(domain: "PolySwap", code: 404, userInfo: [NSLocalizedDescriptionKey: "Apple Music could not find that track."])
        }
        player.queue = [song]
        try await player.play()
        nowPlaying = "\(song.title) — \(song.artistName)"
        status = "playing"
    }
}
