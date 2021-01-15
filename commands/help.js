module.exports = {
    name: 'help',
    usage: 'help [command]',
    description: 'displays a list of commands, or explains a single command more detail',
    execute(msg, args){
        msg.channel.send('pong!');
    }
}