const { Message } = require("discord.js");


module.exports = {
    name: "judge",
    aliases: ['j'],
    description: 'judge a user\'s uses of "your" and "you\'re"',
    async execute(msg, args) { // ASYNC???????????????????
        const chan = msg.channel;
        chan.startTyping();
        if (args.length != 2) {
            return msg.reply(`Usage: ${msg.client.prefix}judge <user> <all || new>`).catch(console.log);
        }
        
        target = msg.mentions.members.first();
        // console.log(target);
        if (!target || (args[1] !== 'all' && args[1] !== 'new')) {
            return msg.reply(`Usage: ${msg.client.prefix}judge <user> <all || new>`).catch(console.log);
        }
        
        let limit = 10;

        const messagesToJudge = [];
        let lastId = 0;
        let prevId = 0;
    
        while (true) {
            console.log("inside loop it");
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            const searchTerms = ["your", "you're", "youre"]
            const fetch = await chan.messages.fetch(options)
                    .then(messages => {
                        if (messages.last()) {
                            lastId = messages.last().id;
                        }
                        messages.filter(m => m.author.id === target.id && searchTerms.some(term => m.content.toLowerCase().includes(term)))
                        .each(m => messagesToJudge.push(m))})
                    .catch(console.error);
            console.log(`prevId = ${prevId}, lastId = ${lastId}`);
            if (prevId == lastId || messagesToJudge >= limit) {
                break;
            }
            prevId = lastId;
        }
        for (message of messagesToJudge) {
            chan.send(`${message.createdAt.toDateString()}: ${message.cleanContent}`);
        }
        chan.stopTyping();
        

        // msg.channel.messages.fetch({ limit : 500 })
        // .then(messages => {
        //     messages.filter(m => m.author.id === target.id).each(m => console.log(m.cleanContent));
        // })
        // .catch(console.error);


        //searchTerms.includes(m.content.toLowerCase())
    }
}