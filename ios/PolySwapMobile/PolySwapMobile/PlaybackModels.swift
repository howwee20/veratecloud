import Foundation

struct PlaybackEnvelope: Decodable {
    let playback: PlaybackSession
}

struct PairingEnvelope: Decodable {
    let sessionId: String
    let accessToken: String
    let playback: PlaybackSession
}

struct PlaybackCommandEnvelope: Decodable {
    let job: CloudJobSummary?
    let playback: PlaybackSession?
}

struct CloudJobSummary: Decodable {
    let id: String
    let title: String
    let status: String
}

struct PlaybackSession: Decodable, Equatable {
    struct Device: Decodable, Equatable {
        let id: String
        let status: String
        let connected: Bool
        let appliedRevision: Int
    }

    let sessionId: String
    let modelId: String
    let desiredState: String
    let requestedQuery: String
    let activeJobId: String?
    let revision: Int
    let lastCommand: String
    let device: Device?
    let error: String
}

struct APIErrorEnvelope: Decodable {
    struct Detail: Decodable { let message: String }
    let error: Detail
}

struct ModelChoice: Identifiable, Hashable {
    let id: String
    let label: String

    static let choices = [
        ModelChoice(id: "polyswap/auto", label: "Auto"),
        ModelChoice(id: "deepseek/deepseek-v4-flash-0731", label: "DeepSeek Flash"),
        ModelChoice(id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna"),
        ModelChoice(id: "google/gemini-3.7-flash", label: "Gemini Flash"),
        ModelChoice(id: "anthropic/claude-sonnet-5", label: "Claude Sonnet"),
        ModelChoice(id: "cloudflare/llama-3.1-8b-fast", label: "Llama Fast")
    ]
}
