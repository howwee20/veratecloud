import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var cloud: CloudPlaybackStore
    @EnvironmentObject private var player: MusicPlaybackController

    var body: some View {
        NavigationStack {
            Group {
                if cloud.isPaired {
                    playerView
                } else {
                    pairingView
                }
            }
            .padding(22)
            .navigationTitle("PolySwap")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var pairingView: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "circle.hexagongrid.fill")
                .font(.system(size: 54))
                .foregroundStyle(.purple)
            Text("Connect this iPhone")
                .font(.title2.bold())
            Text("Open a music job on polyswap.ai, tap “Keep playing after I leave,” then enter the six-digit code.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            TextField("000000", text: $cloud.pairingCode)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .font(.system(size: 30, weight: .semibold, design: .rounded))
                .multilineTextAlignment(.center)
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
            Button("Connect") { Task { await cloud.pair() } }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(cloud.isBusy)
            Text(cloud.message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
    }

    private var playerView: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: player.status == "playing" ? "waveform.circle.fill" : "play.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.purple)
            Text(player.nowPlaying)
                .font(.title3.bold())
                .multilineTextAlignment(.center)
            Text(player.status == "playing" ? "Playing in the background" : cloud.message)
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack {
                Button { Task { await cloud.send("previous") } } label: { Image(systemName: "backward.fill") }
                Button { Task { await cloud.send(player.status == "paused" ? "resume" : "pause") } } label: {
                    Image(systemName: player.status == "paused" ? "play.fill" : "pause.fill")
                }
                Button { Task { await cloud.send("next") } } label: { Image(systemName: "forward.fill") }
            }
            .font(.title2)
            .buttonStyle(.bordered)

            Picker("Model", selection: $cloud.selectedModel) {
                ForEach(ModelChoice.choices) { model in Text(model.label).tag(model.id) }
            }
            .pickerStyle(.menu)

            HStack(spacing: 8) {
                TextField("Ask PolySwap or change the music", text: $cloud.command)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { Task { await cloud.send() } }
                Button { Task { await cloud.send() } } label: { Image(systemName: "arrow.up.circle.fill").font(.title) }
                    .disabled(cloud.command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || cloud.isBusy)
            }
            Spacer()
            Button("Disconnect this iPhone", role: .destructive) { cloud.disconnect() }
                .font(.footnote)
        }
    }
}
