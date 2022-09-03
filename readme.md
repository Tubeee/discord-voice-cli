# status
receiving and sending audio works (tested on linux and macos)
# requirements
relies on discord's custom voice engine built atop WebRTC, which can be fetched using `node downloadVoiceModule.js`. extract `discord_voice.zip` into `node_modules`.
# usage
`node example.js <token> <channel id> <guild id>`

