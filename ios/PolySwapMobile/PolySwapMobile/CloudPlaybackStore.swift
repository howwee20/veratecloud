import Foundation

@MainActor
final class CloudPlaybackStore: ObservableObject {
    @Published var playback: PlaybackSession?
    @Published var pairingCode = ""
    @Published var command = ""
    @Published var selectedModel = "polyswap/auto"
    @Published var message = "Enter the code shown on polyswap.ai."
    @Published var isBusy = false

    private let apiRoot = URL(string: "https://polyswap-api.polyswap.workers.dev")!
    private let sessionKey = "polyswap.playback.session"
    private let tokenKey = "polyswap.playback.token"
    private let deviceKey = "polyswap.playback.device"
    private var pollTask: Task<Void, Never>?
    private weak var player: MusicPlaybackController?

    var isPaired: Bool { sessionId != nil && accessToken != nil }

    private var sessionId: String? {
        get { UserDefaults.standard.string(forKey: sessionKey) }
        set { UserDefaults.standard.set(newValue, forKey: sessionKey) }
    }

    private var accessToken: String? {
        get { UserDefaults.standard.string(forKey: tokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: tokenKey) }
    }

    private var deviceId: String {
        if let existing = UserDefaults.standard.string(forKey: deviceKey) { return existing }
        let created = "device_" + UUID().uuidString.replacingOccurrences(of: "-", with: "_")
        UserDefaults.standard.set(created, forKey: deviceKey)
        return created
    }

    func start(player: MusicPlaybackController) async {
        self.player = player
        guard isPaired else { return }
        await player.prepare()
        beginPolling()
    }

    func connect(sessionId: String, accessToken: String, player: MusicPlaybackController) async {
        let cleanSession = sessionId.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleanSession.hasPrefix("anon_"), !cleanToken.isEmpty else { return }
        self.player = player
        self.sessionId = cleanSession
        self.accessToken = cleanToken
        message = "Connected to PolySwap Cloud."
        await player.prepare()
        beginPolling()
    }

    func pair() async {
        let code = pairingCode.filter(\.isNumber)
        guard code.count == 6 else {
            message = "Enter all six digits."
            return
        }
        isBusy = true
        defer { isBusy = false }
        do {
            let body: [String: Any] = ["code": code, "deviceId": deviceId]
            let envelope: PairingEnvelope = try await request("/v1/playback/pairings/redeem", method: "POST", body: body, authenticated: false)
            sessionId = envelope.sessionId
            accessToken = envelope.accessToken
            playback = envelope.playback
            selectedModel = envelope.playback.modelId
            message = "Connected. PolySwap can keep playing in the background."
            await player?.prepare()
            beginPolling()
        } catch {
            message = error.localizedDescription
        }
    }

    func send(_ text: String? = nil) async {
        let prompt = (text ?? command).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, let sessionId else { return }
        command = ""
        isBusy = true
        defer { isBusy = false }
        do {
            let body: [String: Any] = ["sessionId": sessionId, "prompt": prompt, "modelId": selectedModel]
            let envelope: PlaybackCommandEnvelope = try await request("/v1/playback/commands", method: "POST", body: body)
            if let playback = envelope.playback {
                self.playback = playback
                try await apply(playback)
            }
            message = envelope.job == nil ? "Player updated." : "PolySwap is finding that track."
        } catch {
            message = error.localizedDescription
        }
    }

    func disconnect() {
        pollTask?.cancel()
        pollTask = nil
        sessionId = nil
        accessToken = nil
        playback = nil
        message = "Enter the code shown on polyswap.ai."
    }

    private func beginPolling() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh()
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    private func refresh() async {
        guard let sessionId else { return }
        do {
            let envelope: PlaybackEnvelope = try await request("/v1/playback?sessionId=\(sessionId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? sessionId)")
            playback = envelope.playback
            selectedModel = envelope.playback.modelId
            try await apply(envelope.playback)
        } catch {
            message = error.localizedDescription
        }
    }

    private func apply(_ playback: PlaybackSession) async throws {
        guard let player else { return }
        try await player.apply(playback)
        try await heartbeat(appliedRevision: player.appliedRevision, status: player.status, error: player.lastError)
    }

    private func heartbeat(appliedRevision: Int, status: String, error: String) async throws {
        guard let sessionId else { return }
        let body: [String: Any] = [
            "sessionId": sessionId,
            "deviceId": deviceId,
            "appliedRevision": appliedRevision,
            "status": status,
            "error": error
        ]
        let _: PlaybackEnvelope = try await request("/v1/playback/heartbeat", method: "POST", body: body)
    }

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: [String: Any]? = nil, authenticated: Bool = true) async throws -> T {
        guard let url = URL(string: path, relativeTo: apiRoot) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if authenticated, let accessToken { request.setValue(accessToken, forHTTPHeaderField: "X-PolySwap-Access") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorEnvelope.self, from: data).error.message) ?? "PolySwap could not complete that request."
            throw NSError(domain: "PolySwap", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: message])
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
