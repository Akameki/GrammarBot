let chalk = require('chalk')

module.exports = {
    name: "kickrithik",
    guildOnly: true,
    usage: 'kickithik',
    aliases: ['kr'],
    description: 'kicks rithik from voice channel.',
    async execute(message, args) {
        message.channel.send("no");
        // console.log(chalk.red("kicked rithik"));
        // const rithik = await message.guild.members.fetch('287970695017791489');
        // rithik.edit({ channel: null });
    }
}
