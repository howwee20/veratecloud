# PolySwap iPhone player

This is the background-audio client for the durable playback session hosted by the PolySwap worker.

1. Open `PolySwapMobile.xcodeproj` in Xcode.
2. Choose a unique bundle identifier and a development team.
3. Register that App ID in the Apple Developer portal and enable the MusicKit app service.
4. Run it on a physical iPhone signed into Apple Music.
5. Sign in through the one-screen PolySwap dashboard. The private native bridge
   connects that dashboard session to the MusicKit player automatically.

The target declares the `audio` background mode and configures `AVAudioSession`
for playback. Version 0.3 shows the resolved YouTube video in the same dashboard
while MusicKit carries the matching cloud request through app switching and
screen lock. The six-digit pairing route remains available when the job is sent
from Safari instead of from the native app. MusicKit does not run in the iOS
simulator, so playback must be verified on a physical iPhone.
