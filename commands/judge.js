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
        let filteredMessages = [];
        let lastMessageCheckedId; // id of last message for the current batch of messages
        let jumpedToOldest = false; // used for new mode only
        let oldestMessagePreFetches;
        if (newMode) {
            oldestMessagePreFetches = await message.channel.messages.fetch(targetData.oldestMessageId);
        }

        console.log('  BEFORE fetch loop.');
        console.log(`lastMessageCheckedId=${lastMessageCheckedId}`);
        let fetchLoop = 0; // DEBUG
        // .fetch() has a hard limit of 100, so it is looped until no more messages or the specified limit is exceeded
        while (true) {
            console.log(`  INSIDE fetch loop, iteration ${++fetchLoop}.`); // DEBUG
            const options = { limit: 100 };
            if (lastMessageCheckedId) options.before = lastMessageCheckedId;
            let messages;
            try {
                messages = await message.channel.messages.fetch(options)
            } catch(err) {
                console.error(err);
                message.client.judging = false;
                return message.channel.send("there was an error :/").catch(console.error);
            }
            if (!messages.last()) break;

            lastMessageCheckedId = messages.last().id;
            let unfilteredLength = messages.length;
            messages = messages.filter(m => m.author.id === targetMember.id && searchTerms.some(term => m.content.toLowerCase().includes(term)));
                // .filter(m => m.content.length < 1500) // optional char limit
            // in new mode, once reached a message that has been judged, next fetch loop will jump to fetching before oldestMessageId (if beneficial)
            if (newMode && !jumpedToOldest && messages.some(m => m.id in targetData)) {
                if (messages.last().createdAt > oldestMessagePreFetches.createdAt) {
                    console.log('jumped to oldestMessageId!');
                    lastMessageCheckedId = targetData.oldestMessageId;
                }
                messages = messages.filter(m => !(m.id in targetData));
                jumpedToOldest = true;
            }
            messages.each(m => filteredMessages.push(m));

            if (unfilteredLength < 100 || filteredMessages.length >= limit) {
                break;
            }
        }
        console.log('  OUT of fetch loop.'); // DEBUG

        const actualNumOfMessages = Math.min(filteredMessages.length, limit)

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
            targetData.oldestMessageId = lastMessageCheckedId;
            message.client.updateJSON();
            message.client.judging = false;
            return message.channel.send("No more messages!").catch(console.error);
        }

        /* create embeds */
        let embeds = [];
        for (let i = 0; i < actualNumOfMessages; i++) {
            let msg = filteredMessages[i];
            const embed = new Discord.MessageEmbed()
                .setColor('#aaaaaa')
                                //.setTitle()
                .setAuthor(`The Case of ${targetMember.nickname}`, targetMember.user.avatarURL())
                .setDescription(msg.cleanContent)
                .addField('Time created', msg.createdAt.toDateString(), true)
                .setFooter(`Judge ${msg.member.nickname}, exhibit ${i + 1} of ${actualNumOfMessages}`, msg.author.avatarURL());
            if (msg.editedAt) {
                embed.addField('Last edit', msg.editedAt.toDateString(), true);
            } else { 
                embed.addField('\u200B', '\u200B', true);
            }
            if (targetData[filteredMessages[i].id]) {
                let { verdict, judge } = targetData[filteredMessages[i].id];
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
                embed.setColor(color)
                    .addField("Last judge", ` ${emoji} ${judgeMember.nickname}`, true);
            } else {
                embed.addField('\u200B', '\u200B', true);
            }
            
            embeds.push(embed);
        }

        /* send embed and detect reactions */
        embedMessage = await message.channel.send(embeds[0]).catch(console.error);
        
        try {
            await embedMessage.react('❌');
            await embedMessage.react('✅');
            await embedMessage.react('⏭️');
            await embedMessage.react('⏹️');
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
                    embedMessage.reactions.resolve(reaction.emoji.name).users.remove(user);
                    embedMessage.edit(embeds[++page]);
                } else {
                    embedMessage.reactions.removeAll();
                    reactionCollector.stop("complete");
                    // set oldestMessageId to the last message that was *checked* for search terms (rather than last filtered message)
                    /* helpful if reached the beginning of the text channel:
                     * on the next call, the bot will only check before the oldest message of the channel (nothing) rather than from the
                     * last filtered message, which could potentially save a bit of time doing the same fetch()'s again.
                     */
                    lastMessageChecked = await message.channel.messages.fetch(lastMessageCheckedId);
                    currentOldestMessage = await message.channel.messages.fetch(targetData.oldestMessageId);
                    if (lastMessageChecked.createdAt < currentOldestMessage.createdAt) {
                        targetData.oldestMessageId = lastMessageCheckedId;
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
            const sessionPercentage = Math.round(10 * 100 * correct / (correct + incorrect)) / 10
            const totalPercentage = Math.round(10 * 100 * targetData.correct / (targetData.correct + targetData.incorrect)) / 10
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
        })
    }
}