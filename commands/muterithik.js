const chalk = require('chalk')

module.exports = {
    name: "muterithik",
    guildOnly: true,
    usage: 'muterithik',
    aliases: ['mr'],
    description: 'mutes rithik.',
    async execute(message, args) {
        message.channel.send("no");
        // console.log(chalk.red("muted rithik"));
        // const rithik = await message.guild.members.fetch('287970695017791489');
        // const james = await message.guild.members.fetch('89087845083389952');
        // james.edit({ deaf: !james.voice.deaf});
        // rithik.edit({ mute: !rithik.voice.mute });
    }
}
