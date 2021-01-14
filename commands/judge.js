const Discord = require("discord.js");


module.exports = {
    name: "judge",
    args: true,
    usage: 'judge <user> [all/new] [limit]',
    // aliases: ['j'],
    description: 'judge a user\'s uses of "your" and "you\'re"',
    async execute(msg, args) { // async??
        const channel = msg.channel;

        /* default args */
        let newMode = true;
        let limit = 10;

        console.log(this.usage);
        const usage = this.usage;
        function sendProperUsage() { return channel.send(`Usage: ${msg.client.prefix}${usage}`).catch(console.error); }

        if (!msg.mentions.members.first()) return sendProperUsage();

        const targetMember = msg.mentions.members.first();

        if (args.length == 2) {
            if (args[1].toLowerCase === 'all' || args[1].toLowerCase === 'new') {
                newMode = args[1].toLowerCase === 'new';
            } else if (Number(args[1].isInteger)) {
                limit = parseInt(args[1]);
            } else {
                return sendProperUsage();
            }
        } else if (args.length > 2) {
            if ((args[1].toLowerCase === 'all' || args[1].toLowerCase === 'new') && Number(args[2].isInteger)) {
                newMode = args[1].toLowerCase === 'new';
                limit = parseInt(args[2]);
            } else {
                return sendProperUsage();
            }
        }

        if (args[1] <= 0) {
            return channel.send("invalid limit size you dunce").catch(console.error);
        } else if (args[1] > 30) {
            channel.send("limit lowered to 30").catch(console.error);
            limit = 30;
        }

        channel.startTyping();

        const searchTerms = ["your", "you're", "youre"];
        let messagesToJudge = [];
        let currLastId = 0; // id of last message for the current batch of messages
        let prevLastId = 0; // id of last message for the last batch of messages
        let i = 0; // DEBUG

        console.log('  BEFORE LOOP.');

        // messages.fetch has a hard limit of 100, so it is looped until no more messages or the specified limit is exceeded.
        while (true) {
            console.log("  inside loop!" + ++i); // DEBUG
            const options = { limit: 50 };
            if (currLastId) options.before = currLastId;

            try {
                const messages = await channel.messages.fetch(options)
                if (messages.last()) {
                    currLastId = messages.last().id;
                    messages.filter(m => m.author.id === targetMember.id && searchTerms.some(term => m.content.toLowerCase().includes(term)))
                        // .filter(m => m.content.length < 500) // optional char limit
                        .each(m => messagesToJudge.push(m));
                }
            } catch(err) {
                channel.send("there was an error :/");
                console.error(err);
                break;
            }
            if (prevLastId === currLastId || messagesToJudge.length >= limit) {
                console.log(`  prevID=${prevLastId} lastId=${currLastId} length=${messagesToJudge.length}`) // DEBUG
                break;
            }
            prevLastId = currLastId;
        }
        console.log('  OUT OF LOOP.');
        let textToSend = `*Most recent ${limit} messages to judge for ${targetMember}:*\n`;
        if (messagesToJudge.length) {
            for (let i = Math.min(messagesToJudge.length,  limit) - 1; i >= 0; i--) {
                message = messagesToJudge[i];
                textToSend += `\`${i + 1}. ${message.createdAt.toDateString()}:\` ${message.cleanContent} \n`;
            }
            channel.send(textToSend);
        } else {
            channel.send("No messages to judge.");
        }

        channel.stopTyping();
        let index = 0;
        const messageEmbed = new Discord.MessageEmbed()
            .setColor('#006080')
            .setDescription(messagesToJudge[index].cleanContent)
            //.setTitle(`Judgement of `)
            .setAuthor(`The Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
            .addField('Time created', messagesToJudge[index].createdAt.toDateString(), true)
            .setFooter(`Judge ${msg.member.nickname}`, msg.author.avatarURL());
        if (messagesToJudge[index].editedAt) messageEmbed.addField('Last edit', messagesToJudge[index].editedAt.toDateString(), true);

        channel.send(messageEmbed);
        
    }
}