const {login, connectVoice} = require('.')

const [,, token, channel_id, guild_id] = process.argv

setTimeout(login, 1000, token)
setTimeout(connectVoice, 3000, channel_id, guild_id)
