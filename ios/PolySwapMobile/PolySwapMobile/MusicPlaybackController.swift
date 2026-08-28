import AVFAudio
import Combine
import MusicKit

@MainActor
final class MusicPlaybackController: ObservableObject {
    @Published private(set) var status = "ready"
    @Published private(set) var nowPlaying = "Nothing playing"
    @Published private(set) var lastError = ""
    private(set) var appliedRevision = 0

    private let player = ApplicationMusicPlayer.shared
    private var prepared = false
    private var observations = Set<AnyCancellable>()

    init() {
        player.state.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                DispatchQueue.main.async { self?.syncPlayerState() }
            }
            .store(in: &observations)

        player.queue.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                DispatchQueue.main.async { self?.syncPlayerState() }
            }
            .store(in: &observations)
    }

    func prepare() async {
        guard !prepared else { return }
        do {
            let authorization = await MusicAuthorization.request()
            guard authorization == .authorized else {
                status = "permission-needed"
                lastError = "Allow Apple Music access to play in the background."
                return
            }
            let subscription = try await MusicSubscription.current
            guard subscription.canPlayCatalogContent else {
                status = "subscription-needed"
                lastError = "An Apple Music subscription is required for full-track background playback."
                return
            }
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, policy: .longFormAudio)
            try session.setActive(true)
            prepared = true
            lastError = ""
            syncPlayerState(fallback: "ready")
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
            case "resume":
                try await activateAudioSession()
                try await player.play()
            case "stop":
                player.stop()
            case "next":
                try await player.skipToNextEntry()
            case "previous":
                try await player.skipToPreviousEntry()
            default:
                break
            }
            appliedRevision = cloud.revision
            lastError = ""
            syncPlayerState()
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
        try await activateAudioSession()
        player.queue = [song]
        try await player.prepareToPlay()
        try await player.play()
        nowPlaying = "\(song.title) — \(song.artistName)"
        status = "playing"
    }

    private func activateAudioSession() async throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, policy: .longFormAudio)
        try session.setActive(true)
    }

    private func syncPlayerState(fallback: String? = nil) {
        switch player.state.playbackStatus {
        case .playing:
            status = "playing"
        case .paused:
            status = "paused"
        case .stopped:
            status = fallback ?? "stopped"
        case .interrupted:
            status = "interrupted"
        case .seekingForward, .seekingBackward:
            status = "playing"
        @unknown default:
            status = fallback ?? "ready"
        }

        if let entry = player.queue.currentEntry {
            let subtitle = entry.subtitle?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            nowPlaying = subtitle.isEmpty ? entry.title : "\(entry.title) — \(subtitle)"
        }
    }
}
