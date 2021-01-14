module.exports = {
    name: 'ping',
    usage: 'ping',
    description: 'pong?',
    execute(msg, args){
        msg.channel.send('pong!');
    }
}