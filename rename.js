const chalk = require('chalk');
const Cosplays = require('./data/cosplays.json');
const Cosplayers = {
//   id: { 
//       og: string originalName, 
//       role: obj Role 
//       time: int timeOfCosplay
//   },
//   . . .
};
const TIME = 2;

module.exports = {
    async callback(message) {
        if (message.author.bot || message.channel.type !== "text" || message.member.id === '185847416233132033') return;

        const msg = message.cleanContent.toLowerCase();
        const id = message.member.id;

        for (const name in Cosplays) {
            // if message includes one of the triggers
            if (Cosplays[name].triggers.some(trigger => msg.includes(trigger))) {
                const color = Cosplays[name].color;
                const position = message.member.guild.roles.highest.position;
                
                /*/ROLES*/let role = await message.guild.roles.create( { data: { name, color, position } } );

                /*/ROLES*/await message.member.roles.add(role);
                /*/ROLES*/if (Cosplayers[id]) await Cosplayers[id].role.delete(); // delete the preexisting role (if needed)

                Cosplayers[id] = Cosplayers[id] ?? { og: message.member.displayName };
                /*/ROLES*/Cosplayers[id].role = role;
                Cosplayers[id].time = Cosplays[name].time ?? 1;

                await message.member.setNickname(name);
                /*/ROLES*/await message.member.roles.add(role);

                return console.log(chalk.greenBright.bold(`${chalk.blueBright(Cosplayers[id].og)} is now cosplaying as ${name}!`));
            }
        }
        
        // reset name and remove role when needed
        if (Cosplayers[id] && (!Cosplayers[id].time || !--Cosplayers[id].time)) {
            await message.member.setNickname(Cosplayers[id].og);
            /*/ROLES*/await Cosplayers[id].role.delete();
            console.log(chalk.yellowBright(`${chalk.blueBright(Cosplayers[id].og)} is no longer cosplaying!`))
            delete Cosplayers[id];
        }
    }
}