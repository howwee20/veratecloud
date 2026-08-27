# PolySwap iPhone player

This is the background-audio client for the durable playback session hosted by the PolySwap worker.

1. Open `PolySwapMobile.xcodeproj` in Xcode.
2. Choose a unique bundle identifier and a development team.
3. Register that App ID in the Apple Developer portal and enable the MusicKit app service.
4. Run it on a physical iPhone signed into Apple Music.
5. In a PolySwap music Job Room, tap **Keep playing after I leave** and enter the six-digit code in the app.

The target declares the `audio` background mode and configures `AVAudioSession` for playback. MusicKit does not run in the iOS simulator, so playback must be verified on a physical iPhone.
