# status
receiving and sending audio works
# usage
relies on discord's custom voice engine built atop WebRTC, which can be fetched from https://discord.com/api/modules/stable/discord_voice/1?host_version=0.0.18&platform=linux for linux, presumably works on other platforms too.
no real interface implemented yet, test with `node --inspect .`, then `init(token)` and `connectVoice(guild_id, channel_id)` in the debugger console