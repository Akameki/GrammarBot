const Discord = require('discord.js');
const Chalk = require('chalk')
const { prefix, token } = require('./config.json');
const fs = require('fs');

const { Client, Intents } = require("discord.js")
let intents = new Intents(Intents.NON_PRIVILEGED);
intents.add('GUILD_MEMBERS');
const client = new Client({ ws: {intents: intents} });


// const client =  new Discord.Client();
client.commands = new Discord.Collection();
client.prefix = prefix;

const rename = require('./rename.js');

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

client.once('ready', async () => {
    console.log(Chalk.green.bold('Beep boop! Bot is ready!'))
    // let lnd = await client.channels.fetch('773428545766555648');
    // let server = await client.guilds.fetch('765758952243068938');
    // // let boob = await (message.guild.members.fetch('285480424904327179'));
    // let kyoko = await (server.members.fetch('375750637540868107'));
    // lnd.updateOverwrite(kyoko, {
    //     SEND_MESSAGES: true,
    //     VIEW_CHANNEL: true
    // }).catch(console.error);

    // let members = await server.members.fetch();
    // // console.log(members);
    // for (member of members) {
    //     if (member[1].nickname == "OOOOOooOOOo") {
    //         console.log("yeet");
    //         member[1].setNickname("");
    //     } else console.log("no", member.nickname);
    //     console.log(member);
    // }
    console.log(Chalk.green.bold('Beep boop!!!'))
});

client.on('message', async message => {
    console.log(message.guild.id)

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

client.on('message', rename.callback);

client.updateJSON = function() {
    fs.writeFileSync('./data/data.json', JSON.stringify(client.data, null, '\t'), err => {
        if (err) throw err;
        console.log('updated data.json');
    }); 
}

client.login(token);
