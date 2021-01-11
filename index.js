const Discord = require('discord.js');
const config = require('./config.json');
const fs = require('fs');

const client =  new Discord.Client();
client.prefix = 'ur';

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('bot online');
});

client.on('message', msg => {
    if (!msg.content.startsWith(client.prefix) || msg.author.bot) return;

    const args = msg.content.slice(client.prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        client.commands.get('ping').execute(msg, args);
    } else if (command === 'judge') {
        client.commands.get('judge').execute(msg, args);

    }
});



client.login(config.token);