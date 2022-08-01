const WebSocket = require('ws')
const VoiceEngine = require('discord_voice')
const randomUUID = require('crypto').randomUUID

const CLIENT_CODECS = [{
    type: "audio",
    name: "opus",
    priority: 1000,
    payload_type: 120
}]

VoiceEngine.setInputDevice('default')
VoiceEngine.setOutputDevice('default')

const ws = new WebSocket('wss://gateway.discord.gg/?encoding=json&v=9')
ws.on('message', onMessage)

function init(token) { // [1]
    ws.send(JSON.stringify(
        {
            op: 2,
            d: {
                token,
                capabilities: 509,
                properties: {
                    os: "Linux",
                    browser: "Discord Client",
                    release_channel: "stable",
                    client_version: "0.0.18",
                    os_version: "5.18.13-200.fc36.x86_64",
                    os_arch: "x64",
                    system_locale: "en-US",
                    window_manager: "GNOME,gnome-xorg",
                    client_build_number: 138734,
                    client_event_source: null
                },
                presence: { status: "online", since: 0, activities: [], afk: false },
                compress: false,
                client_state: { guild_hashes: {}, highest_last_message_id: "0", read_state_version: 0, user_guild_settings_version: -1 },
            }
        }
    ))
}


let seq = 0
function onMessage(msg) {
    //debugger
    msg = JSON.parse(msg)
    switch (msg.op) {
        case 0:
            onEvent(msg)
        case 7: // Reconnect
        case 9: // Invalid Session
            break
        case 10: // Hello
            setInterval(() => ws.send(JSON.stringify({ op: 1, d: seq })), msg.d.heartbeat_interval)
        case 11: // Heartbeat ACK
    }
}

let voiceState, voiceGateway, userId
function onEvent(msg) {
    seq = msg.s

    switch (msg.t) {
        case 'READY': //[2]
            userId = msg.d.user.id
            break
        case 'VOICE_STATE_UPDATE': // [4]
            if (msg.d.user_id == userId) voiceState = msg.d
            break
        case 'VOICE_SERVER_UPDATE': // [5]
            const { endpoint, token, guild_id, channel_id } = msg.d
            voiceGateway = new WebSocket('wss://' + endpoint + '?v=7')
            voiceGateway.on('message', msg => console.log('VoiceGateway recv', JSON.parse(msg)))
            voiceGateway.on('message', onVoiceMessage)
            voiceGateway.on('open', e => voiceGateway.send(JSON.stringify({
                op: 0,
                d: {
                    server_id: guild_id || channel_id,
                    session_id: voiceState.session_id,
                    streams: [{ type: "video", rid: "100", qualiy: 100 }, { type: "video", rid: "50", qualiy: 50 }],
                    token,
                    user_id: voiceState.user_id,
                    video: true
                }
            }))
            )
    }
}


let voiceInstance
function onVoiceMessage(msg) {
    msg = JSON.parse(msg)
    switch (msg.op) {
        case 2: // Ready [7]
            const { ip: address, port, ssrc, modes, experiments, streams: streamParameters } = msg.d
            voiceInstance = VoiceEngine.createVoiceConnectionWithOptions(voiceState.user_id, { address, port, ssrc, modes, experiments: experiments.concat(['connection_log']), streamParameters, qosEnabled: false }, createVoiceConnectionCallback)
            voiceInstance.setTransportOptions({
                "inputMode": 1,
                "inputModeOptions": {
                    "vadThreshold": -60,
                    "vadAutoThreshold": 3,
                    "vadUseKrisp": false,
                    "vadLeading": 5,
                    "vadTrailing": 25
                }
            })
            voiceInstance.setOnSpeakingCallback((_userId, speaking) => {
                if (_userId == userId)
                    voiceGateway.send(JSON.stringify({ op: 5, d: { ssrc, speaking, delay: 0 } }))
            })

            break
        case 4: //Session Description [9]
            const { mode, secret_key: secretKey } = msg.d
            voiceInstance.setTransportOptions({ encryptionSettings: { mode, secretKey } })
            break
        case 8: // Hello [6]
            setInterval(() => voiceGateway.send(JSON.stringify({ op: 3, d: Date.now() })), msg.d.heartbeat_interval)
            break
        case 5: // Speaking //This seems to only be sent once per speaker when using the native client.
            voiceInstance.mergeUsers([{ id: msg.d.user_id, ssrc: msg.d.ssrc, videoSsrc: 0, rtxSsrc: 0, mute: false, volume: 1 }])
    }

}

function createVoiceConnectionCallback(err, { protocol, address, port }) { // [8]
    if (err) {
        console.log('createVoiceConnection error', err)
    } else {
        console.log('Connected')
        voiceGateway.send(JSON.stringify({
            op: 1,
            d: {
                protocol,
                address,
                port,
                mode: 'aead_aes256_gcm_rtpsize',
                rtc_connection_id: randomUUID(), //this is a client-side generated (in javascript) random UUID4
                data: {
                    address,
                    port,
                    mode: 'aead_aes256_gcm_rtpsize',
                },
                codecs: CLIENT_CODECS
            }
        }))
    }
}


function connectVoice(guildId, channelId) { // [3]
    //guildId null if DM channel
    ws.send(JSON.stringify({
        op: 4,
        d: {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: false,
            self_deaf: false,
            self_video: false
        }
    }))
}


WebSocket.prototype._send = WebSocket.prototype.send
WebSocket.prototype.send = function (data) {
    console.log('WS send', JSON.parse(data))
    WebSocket.prototype._send.call(this, data)
}

ws.on('message', msg => console.debug('RGateway recv', JSON.parse(msg)))
global.init = init
global.connectVoice = connectVoice
global.voiceInstance = voiceInstance
global.VoiceEngine = VoiceEngine
