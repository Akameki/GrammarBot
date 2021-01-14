const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const fs = require('fs');

const client =  new Discord.Client();
client.commands = new Discord.Collection();
client.prefix = prefix;

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Beep boop! Bot is ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;
    const command = client.commands.get(commandName);

    if (command.args && !args.length) {
        return message.channel.send(`Usage: ${prefix} ${command.usage}`);
    }

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.channel.send('something went wrong D:');
    }

});



client.login(token);