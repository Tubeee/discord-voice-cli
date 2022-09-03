const fs = require('fs');
const { Writable } = require('node:stream')

const platform = {
    win32: 'win', darwin: 'osx', linux: 'linux'
}[process.platform];

async function downloadVoiceModule(platform) {
    const dlHead = await fetch(`https://discord.com/api/download?platform=${platform}`, { method: 'HEAD' })
    const currentVersion = dlHead.url.split('/').at(-2)

    console.log(`https://discord.com/api/modules/stable/versions.json?platform=${platform}&host_version=${currentVersion}`)
    const moduleVersions = await fetch(`https://discord.com/api/modules/stable/versions.json?platform=${platform}&host_version=${currentVersion}`)
    const discordVoiceVersion = (await moduleVersions.json())['discord_voice']
    console.log(`https://discord.com/api/modules/stable/discord_voice/${discordVoiceVersion}/?host_version=${currentVersion}&platform=${platform}`)
    const dl = await fetch(`https://discord.com/api/modules/stable/discord_voice/${discordVoiceVersion}?host_version=${currentVersion}&platform=${platform}`)
    dl.body.pipeTo(Writable.toWeb(fs.createWriteStream(`./discord_voice.zip`)))
}

downloadVoiceModule(platform)