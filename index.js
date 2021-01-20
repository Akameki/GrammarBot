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

if (!fs.existsSync('./data/data.json')) {
    fs.writeFileSync('./data/data.json', JSON.stringify({}), err => {
        if (err) throw err;
        console.log('Created new data.json');
    }); 
}
client.data = require('./data/data.json')

client.once('ready', () => {
    console.log('Beep boop! Bot is ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) 
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    if (command.guildOnly && message.channel.type === "dm") {
        return message.channel.send("That's a server only command!")
    }
    if (command.args && !args.length) {
        return message.channel.send(`Usage: ${prefix}${command.usage}`);
    }

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.channel.send('something went wrong D:');
    }

});

client.updateJSON = function() {
    fs.writeFileSync('./data/data.json', JSON.stringify(client.data, null, '\t'), err => {
        if (err) throw err;
        console.log('updated data.json');
    }); 
}

client.login(token);