const Discord = require("discord.js");

module.exports = {
    name: "avatar",
    guildOnly: true,
    args: true,
    usage: 'avatar <user>',
    aliases: ['a'],
    async execute(message, args) { 
        let target;
        if (!(target = message.mentions.members.first())) return message.channel.send("specify a user!").catch(console.error);

        message.channel.send(target.user.avatarURL({ format: "png", size: 256 })).catch(console.error);
    }
}