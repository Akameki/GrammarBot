const Discord = require("discord.js");


module.exports = {
    name: "judge",
    guildOnly: true,
    args: true,
    usage: 'judge <user> [all/new] [limit]',
    aliases: ['j'],
    description: 'judge a user\'s uses of "your" and "you\'re"',
    async execute(message, args) { // async??

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
            } else if (Number.isInteger(+args[1])) {
                limit = +args[1];
            } else {
                return sendProperUsage();
            }
        } else if (args.length > 2) {
            if ((args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'new') && Number.isInteger(+args[2])) {
                newMode = args[1].toLowerCase() === 'new';
                limit = +args[2];
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
        const channelId = message.channel.id;
        const targetId = targetMember.id;
        message.client.data[channelId] = message.client.data[channelId] ?? {};
        message.client.data[channelId][targetId] = message.client.data[channelId][targetId] ?? { correct: 0, incorrect: 0 };

        const targetData = message.client.data[channelId][targetId];

        /* fetch and filter messages for search terms */
        message.channel.startTyping();
        message.client.judging = true;

        const searchTerms = ["your", "you're", "youre"];
        let filteredMessages = [];
        let lastMessageFetchedId;
        if (newMode) {
            var caughtUp = false; // true when fetch() retrieves an already judged message
            var targetDataOldestMessage = await message.channel.messages.fetch(targetData.oldestMessageId);
        }

        console.log('  BEFORE fetch loop.');
        console.log(`lastMessageCheckedId=${lastMessageFetchedId}`);
        let fetchLoop = 0; // DEBUG
        // .fetch() has a hard limit of 100, so it is looped until no more messages or the specified limit is exceeded
        while (true) {
            console.log(`  INSIDE fetch loop, iteration ${++fetchLoop}.`); // DEBUG
            const options = { limit: 100 };
            if (lastMessageFetchedId) options.before = lastMessageFetchedId;

            try {
                var messages = await message.channel.messages.fetch(options);
            } catch(err) {
                console.error(err);
                message.client.judging = false;
                return message.channel.send("there was an error :/").catch(console.error);
            }
            if (!messages.size) break;

            lastMessageFetchedId = messages.last().id;
            let unfilteredLength = messages.size;
            messages = messages.filter(m => m.author.id === targetMember.id && searchTerms.some(term => m.content.toLowerCase().includes(term)));
            // .filter(m => m.content.length < 1500) // optional char limit

            // in new mode, once reached a message that has been judged, next fetch loop will jump to fetching before oldestMessageId if it's older
            if (newMode && !caughtUp && messages.some(m => m.id in targetData)) {
                if (messages.last().createdAt > targetDataOldestMessage.createdAt) {
                    console.log("jumped to oldestMessageId!");
                    lastMessageFetchedId = targetData.oldestMessageId;
                }
                messages = messages.filter(m => !(m.id in targetData));
                caughtUp = true;
            }

            messages.each(m => filteredMessages.push(m));

            if (unfilteredLength < 100 || filteredMessages.length >= limit) {
                break;
            }
        }
        console.log('  OUT of fetch loop.'); // DEBUG

        filteredMessages = filteredMessages.slice(0, limit);

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

        if (!filteredMessages.length) {
            targetData.oldestMessageId = lastMessageFetchedId;
            message.client.updateJSON();
            message.client.judging = false;
            return message.channel.send("No more messages!").catch(console.error);
        }

        /* create embeds */
        let embeds = await createEmbeds(filteredMessages, targetMember, targetData);
        
        embedMessage = await message.channel.send(new Discord.MessageEmbed().setDescription(" . . . ")).catch(console.error);

        try {
            await embedMessage.react('❌');
            await embedMessage.react('✅');
            await embedMessage.react('⏭️');
            await embedMessage.react('⏹️');
            await embedMessage.edit(embeds[0]);
        } catch (error) {
            console.error(error);
            message.channel.send(error.message).catch(console.error);
        }

        const filter = (reaction, user) => ['❌', '✅', '⏭️', '⏹️'].includes(reaction.emoji.name) && message.author.id === user.id;
        const reactionCollector = embedMessage.createReactionCollector(filter, { idle: 2 * 60 * 1000 }); // 2 minutes

        let page = 0;
        let incorrect = 0;
        let correct = 0;
        targetData.oldestMessageId = targetData.oldestMessageId ?? filteredMessages[0].id;
        let oldestMessage = await message.channel.messages.fetch(targetData.oldestMessageId)

        reactionCollector.on("collect", async (reaction, user)  => {
            try {
                if (reaction.emoji.name === '⏹️') return reactionCollector.stop("stop");

                currentMessage = filteredMessages[page]; // the id of the message containing the search term, NOT the message with the embed
                targetData[currentMessage.id] = targetData[currentMessage.id] ?? {};

                targetMessageData = targetData[currentMessage.id]

                if (currentMessage.createdAt < oldestMessage.createdAt) { // will always be true after first time it's true
                    targetData.oldestMessageId = currentMessage.id;
                }

                targetMessageData.judge = user.id;

                if (targetMessageData.verdict === "incorrect") targetData.incorrect--;
                if (targetMessageData.verdict === "correct") targetData.correct--;
                switch (reaction.emoji.name) {
                    case '❌':
                        targetMessageData.verdict = "incorrect";
                        targetData.incorrect++;
                        incorrect++;
                        break;
                    case '✅':
                        targetMessageData.verdict = "correct";
                        targetData.correct++;
                        correct++;
                        break;
                    case '⏭️':
                        targetMessageData.verdict = "skipped";
                        break;
                }

                if (page < embeds.length - 1) {
                    await embedMessage.edit(embeds[++page]);
                    embedMessage.reactions.resolve(reaction.emoji.name).users.remove(user);
                } else {
                    embedMessage.reactions.removeAll();
                    reactionCollector.stop("complete");
                    /* helpful if reached the beginning of the text channel:
                     * on the next call, the bot will only check before the last fetched message (nothing!) rather than from the
                     * last filtered message, which could potentially save a bit of time doing the same fetch()'s again.
                     */
                    if (filteredMessages.length < limit) {
                        targetData.oldestMessageId = lastMessageFetchedId;
                    }
                }
            } catch (error) {
                console.error(error);
                return message.channel.send(error.message).catch(console.error);
            }
        });
        reactionCollector.on('end', (collected, reason) => {
            console.log(`collector end: ${reason}`);

            embedMessage.reactions.removeAll();
            const sessionPercentage = (100 * correct / (correct + incorrect)).toFixed(1); //Math.round(10 * 100 * correct / (correct + incorrect)) / 10
            const totalPercentage = (100 * targetData.correct / (targetData.correct + targetData.incorrect)).toFixed(1); //Math.round(10 * 100 * targetData.correct / (targetData.correct + targetData.incorrect)) / 10
            let heading, color;
            switch (reason) {
                case "complete":
                    [heading, color] = ["Results for the Case of", '#ebfffd'];
                    break;
                case "stop":
                    [heading, color] = ["[⏹️STOPPED] Case of", '#ffb5cc'];
                    break;
                case "idle":
                    [heading, color] = ["[⌛EXPIRED] Case of", '#ffb5cc'];
                    break;
            }
            const resultsEmbed = new Discord.MessageEmbed()
                .setColor(color)
                .setAuthor(`${heading} ${targetMember.nickname}`, targetMember.user.avatarURL())
                .addField("This session", `${correct} ✅ ${incorrect} ❌ - ${sessionPercentage}%`, true)
                .addField("Total in channel", `${targetData.correct} ✅ ${targetData.incorrect} ❌ - ${totalPercentage}%`, true)
                .setFooter(`Judge ${message.member.nickname}`, message.author.avatarURL());
            embedMessage.edit(resultsEmbed);
            message.client.updateJSON();
            message.client.judging = false;
        });
    }
}

// creates embeds
// messages: the messages to wrap embeds in
// target: the target as a GuildMember
// targetData: the object containg past details
async function createEmbeds(messages, targetMember, targetData){
    const embeds = [];
    let page = 1;
    for (let message of messages) {
        const embed = new Discord.MessageEmbed()
            .setColor('#aaaaaa')
            .setAuthor(`The Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
            .setDescription(message.cleanContent)
            .addField("Time created", message.createdAt.toDateString(), true)
            .setFooter(`Judge ${message.member.nickname}, exhibit ${page++} of ${messages.length}`, message.author.avatarURL());
        if (message.editedAt) {
            embed.addField("Last edit", message.editedAt.toDateString(), true);
        } else { 
            embed.addField('\u200B', '\u200B', true);
        }
        if (targetData[message.id]) {
            const { verdict, judge } = targetData[message.id];
            const judgeMember = await message.guild.members.fetch(judge).catch(console.error);
            switch (verdict) {
                case "correct":
                    var [color, emoji] = ['#39db3e', '✅'];
                    break;
                case "incorrect":
                    var [color, emoji] = ['#eb1a1a', '❌'];
                    break;
                case "skipped":
                    var [color, emoji] = ['#fcff42', '⏭️'];
                    break;
            }
            embed.setColor(color)
                .addField("Last judge", ` ${emoji} ${judgeMember.nickname}`, true);
        } else {
            embed.addField('\u200B', '\u200B', true);
        }
        embeds.push(embed);
    }
    return embeds;
}