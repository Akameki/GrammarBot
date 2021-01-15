const Discord = require("discord.js");


module.exports = {
    name: "judge",
    args: true,
    usage: 'judge <user> [all/new] [limit]',
    // aliases: ['j'],
    description: 'judge a user\'s uses of "your" and "you\'re"',
    async execute(message, args) { // async??
        const channel = message.channel;

        /* default args */
        let newMode = true;
        let limit = 10;

        /* check and assign user args */
        const usage = this.usage;
        function sendProperUsage() { return message.channel.send(`Usage: ${message.client.prefix}${usage}`).catch(console.error); }

        if (!message.mentions.members.first()) return sendProperUsage();

        const targetMember = message.mentions.members.first();

        if (args.length == 2) {
            if (args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'new') {
                newMode = args[1].toLowerCase() === 'new';
            } else if (Number.isInteger(Number(args[1]))) {
                limit = parseInt(args[1]);
            } else {
                return sendProperUsage();
            }
        } else if (args.length > 2) {
            if ((args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'new') && Number.isInteger(Number(args[2]))) {
                newMode = args[1].toLowerCase() === 'new';
                limit = parseInt(args[2]);
            } else {
                return sendProperUsage();
            }
        }

        if (message.client.judging) return message.channel.send("please wait for the previous judgement to be completed or stopped");

        if (args[1] <= 0) {
            return message.channel.send("limit must be positive you dunce").catch(console.error);
        } else if (args[1] > 30) {
            message.channel.send("limit lowered to 30").catch(console.error);
            limit = 30;
        }

        /* check data.json */
        let channelId = message.channel.id;
        if (!(channelId in message.client.data)) {
            message.client.data[channelId] = {};
        }
        let targetId = targetMember.id;
        if (!(targetId in message.client.data[channelId])) {
            message.client.data[channelId][targetId] = { correct: 0, incorrect: 0 };
        }
        let targetData = message.client.data[channelId][targetId];

        /* filter messages for search terms */
        message.channel.startTyping();
        message.client.judging = true;

        const searchTerms = ["your", "you're", "youre"];
        let messagesToJudge = [];
        let currLastId = newMode ? targetData.oldestMessageId ?? 0 : 0; // id of last message for the current batch of messages
        let prevLastId = 0; // id of last message for the last batch of messages
        let fetchLoop = 0; // DEBUG

        console.log('  BEFORE fetch loop.');
        console.log(`currLastId=${currLastId}`);
        // .fetch() has a hard limit of 100, so it is looped until no more messages or the specified limit is exceeded
        while (true) {
            console.log(`  INSIDE fetch loop, iteration ${++fetchLoop}.`); // DEBUG
            const options = { limit: 100 };
            if (currLastId) options.before = currLastId;
            try {
                const messages = await message.channel.messages.fetch(options)
                if (messages.last()) {
                    currLastId = messages.last().id;
                    messages.filter(m => m.author.id === targetMember.id && searchTerms.some(term => m.content.toLowerCase().includes(term)))
                        // .filter(m => m.content.length < 500) // optional char limit
                        .each(m => messagesToJudge.push(m));
                }
            } catch(err) {
                message.channel.send("there was an error :/");
                console.error(err);
                break;
            }
            if (prevLastId === currLastId || messagesToJudge.length >= limit) {
                break;
            }
            prevLastId = currLastId;
        }
        console.log('  OUT of fetch loop.'); // DEBUG

        const actualNumOfMessages = Math.min(messagesToJudge.length, limit)

        // let textToSend = `*Most recent ${limit} messages to judge for ${targetMember}:*\n`;
        // if (messagesToJudge.length) {
        //     for (let i = actualNumOfMessages - 1; i >= 0; i--) {
        //         message = messagesToJudge[i];
        //         textToSend += `\`${i + 1}. ${message.createdAt.toDateString()}:\` ${message.cleanContent} \n`;
        //     }
        //     message.channel.send(textToSend);
        // } else {
        //     message.channel.send("No messages to judge.");
        // }

        message.channel.stopTyping();

        if (!actualNumOfMessages) {
            targetData.oldestMessageId = currLastId;
            message.client.judging = false;
            return message.channel.send("No more messages!").catch(console.error);
        }

        /* create embeds */
        let embeds = [];
        for (let i = 0; i < actualNumOfMessages; i++) {
            let msg = messagesToJudge[i];
            const messageEmbed = new Discord.MessageEmbed()
                .setColor('#aaaaaa')
                                //.setTitle()
                .setAuthor(`The Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
                .setDescription(msg.cleanContent)
                .addField('Time created', msg.createdAt.toDateString(), true)
                .setFooter(`Judge ${msg.member.nickname}, exhibit ${i + 1} of ${actualNumOfMessages}`, msg.author.avatarURL());
            if (msg.editedAt) {
                messageEmbed.addField('Last edit', msg.editedAt.toDateString(), true);
            } else { 
                messageEmbed.addField('\u200B', '\u200B', true);
            }
            if (targetData[messagesToJudge[i].id]) {
                let { verdict, judge } = targetData[messagesToJudge[i].id];
                let color, emoji
                let judgeMember = await message.guild.members.fetch(judge)
                switch (verdict) {
                    case "correct":
                        [color, emoji] = ['#39db3e', '✅'];
                        break;
                    case "incorrect":
                        [color, emoji] = ['#eb1a1a', '❌'];
                        break;
                    case "skipped":
                        [color, emoji] = ['#fcff42', '⏭️'];
                        break;
                }
                messageEmbed.setColor(color)
                    .addField("Last judge", ` ${emoji} ${judgeMember.nickname}`, true);
            } else {
                messageEmbed.addField('\u200B', '\u200B', true);
            }
            
            embeds.push(messageEmbed);
        }

        /* send embed and detect reactions */
        embedMessage = await message.channel.send(embeds[0]).catch(console.error);
        
        try {
            await embedMessage.react("❌");
            await embedMessage.react("✅");
            await embedMessage.react("⏭️");
            await embedMessage.react("⏹️");
        } catch (error) {
            console.error(error);
            message.channel.send(error.message).catch(console.error);
        }

        const filter = (reaction, user) => ["❌", "✅", "⏭️", "⏹️"].includes(reaction.emoji.name) && message.author.id === user.id;
        const collector = embedMessage.createReactionCollector(filter, { time: 10 * 60 * 1000 }); // 10 minutes
        let page = 0;
        let currentMessageId;
        let incorrect = 0;
        let correct = 0;
        let stopped = false;

        collector.on("collect", async (reaction, user)  => {
            try {
                currentMessageId = messagesToJudge[page].id; // the id of the message containing the search term, NOT the message with the embed
                if (!(currentMessageId in targetData)) targetData[currentMessageId] = {};

                targetMessageData = targetData[currentMessageId]

                targetMessageData.judge = user.id;

                oldestMessage = await message.channel.messages.fetch(targetData.oldestMessageId);
                if (!('oldestMessageId' in targetData) || messagesToJudge[page].createdAt < oldestMessage.createdAt) { // if older than what's stored
                    targetData.oldestMessageId = currentMessageId;
                }
                // remove previous verdict
                if (targetMessageData.verdict === "incorrect") targetData.incorrect--;
                if (targetMessageData.verdict === "correct") targetData.correct--;

                if (reaction.emoji.name === "❌") {
                    targetMessageData.verdict = "incorrect";
                    targetData.incorrect++;
                    incorrect++;
                } else if (reaction.emoji.name === "✅") {
                    targetMessageData.verdict = "correct";
                    targetData.correct++;
                    correct++;
                } else if (reaction.emoji.name === "⏭️") {
                    targetMessageData.verdict = "skipped";
                } else { // undo the remove :D
                    if (targetMessageData.verdict === "incorrect") targetData.incorrect++;
                    if (targetMessageData.verdict === "correct") targetData.correct++;
                    stopped = true;
                }

                if (!stopped && page < embeds.length - 1) {
                    reaction.message.reactions.resolve(reaction.emoji.name).users.remove(user);
                    embedMessage.edit(embeds[++page]);
                } else {
                    // set oldestMessageId to the last message that was *checked* for search terms (rather than last filtered message)
                    if (!stopped && message.channel.messages.fetch(currLastId).createdAt < oldestMessage.createdAt) targetData.oldestMessageId = currLastId;
                    collector.stop();
                    reaction.message.reactions.removeAll();
                    const resultsEmbed = new Discord.MessageEmbed()
                    .setColor('#aaaaff')
                    .setAuthor(`Results for the Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
                    //.setDescription(`  ${correct} ✅ ${incorrect} ❌ - ${Math.round(10*100*correct / (correct+incorrect))/10}%`)
                    .addFields(
                        {
                            name: "This session",
                            value: `${correct} ✅ ${incorrect} ❌ - ${Math.round(10*100*correct / (correct+incorrect))/10}%`,
                            inline: true
                        },
                        {
                            name: `Total in channel`,
                            value: `${targetData.correct} ✅ ${targetData.incorrect} ❌ - ${Math.round(10*100*targetData.correct / (targetData.correct+targetData.incorrect))/10}%`,
                            inline: true
                        })
                    .setFooter(`Judge ${message.member.nickname}`, message.author.avatarURL());
                    embedMessage.edit(resultsEmbed)
                    message.client.updateJSON();
                    message.client.judging = false;
                }
            } catch (error) {
                console.error(error);
                return message.channel.send(error.message).catch(console.error);
            }
        });
    }
}