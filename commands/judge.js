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

        const usage = this.usage;
        function sendProperUsage() { return channel.send(`Usage: ${msg.client.prefix}${usage}`).catch(console.error); }

        if (!msg.mentions.members.first()) return sendProperUsage();

        const targetMember = msg.mentions.members.first();

        if (args.length == 2) {
            if (args[1].toLowerCase === 'all' || args[1].toLowerCase === 'new') {
                newMode = args[1].toLowerCase === 'new';
            } else if (Number.isInteger(Number(args[1]))) {
                limit = parseInt(args[1]);
            } else {
                console.log()
                return sendProperUsage();
            }
        } else if (args.length > 2) {
            if ((args[1].toLowerCase === 'all' || args[1].toLowerCase === 'new') && Number.isInteger(Number(args[2]))) {
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
        let fetchLoop = 0; // DEBUG

        console.log('  BEFORE LOOP.');

        // messages.fetch has a hard limit of 100, so it is looped until no more messages or the specified limit is exceeded.
        while (true) {
            console.log("  inside loop!" + ++fetchLoop); // DEBUG
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

        const actualNumOfMessages = Math.min(messagesToJudge.length, limit)

        let textToSend = `*Most recent ${limit} messages to judge for ${targetMember}:*\n`;
        if (messagesToJudge.length) {
            for (let i = actualNumOfMessages - 1; i >= 0; i--) {
                message = messagesToJudge[i];
                textToSend += `\`${i + 1}. ${message.createdAt.toDateString()}:\` ${message.cleanContent} \n`;
            }
            channel.send(textToSend);
        } else {
            channel.send("No messages to judge.");
        }

        channel.stopTyping();
        let embeds = [];
        for (let i = 0; i < actualNumOfMessages; i++) {
            let message = messagesToJudge[i];
            const messageEmbed = new Discord.MessageEmbed()
                .setColor('#006080')
                .setDescription(message.cleanContent)
                //.setTitle(`Judgement of `)
                .setAuthor(`The Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
                .addField('Time created', message.createdAt.toDateString(), true)
                .setFooter(`Judge ${msg.member.nickname}, exhibit ${i + 1} of ${actualNumOfMessages}`, msg.author.avatarURL());
            if (message.editedAt) messageEmbed.addFields(
                {
                name: 'Last edit',
                value: message.editedAt.toDateString(),
                inline: true
                },
                { name: '\u200B', value: '\u200B', inline: true }
            );
            
            embeds.push(messageEmbed);
            
        }

        let lastMessage;
        for (let i = 0; i < actualNumOfMessages; i++) {
            await channel.send(embeds[i]).then((msg) => lastMessage = msg).catch(console.error);
            await lastMessage.delete({ timeout: 3500 }).catch(console.error);
        }
        
    }
}