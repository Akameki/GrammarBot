const Discord = require("discord.js");
const axios = require('axios').default;


module.exports = {
    name: "color",
    args: true,
    usage: 'color <hex code>',
    aliases: ['c', 'colour'],
    description: 'color.',
    async execute(message, args) {

        let input = args.join("").replace("\\s+", "");

        let isHex = /^#[0-9A-F]{6}$/i.test(input);
        let isRgb = /(\d{1,3}),(\d{1,3}),(\d{1,3})/.test(input);
        let hex, rgb;

        if (isHex) {
            hex = input[0] == "#" ? input : "#"+input;
            rgb = hexToRgb(hex);
        } else if (isRgb) {
            hex = rgbToHex(input);
            if (!hex) return message.channel.send("RGB values must be 255 or less!");
            rgb = hexToRgb(hex);
        } else {
            return message.channel.send("not a valid RGB or hex color code!");
        }
        console.log(hex);

        // random casing!
        // let tempHex = "";
        // for (let i = 0; i < hex.length; i++) {
        //     tempHex += Math.floor(Math.random()*2) ? hex.charAt(i).toUpperCase() : hex.charAt(i).toLowerCase()
        // }
        // hex = tempHex;
        hex = hex.toUpperCase();


        function componentToHex(c) {
            var hex = (+c).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        function rgbToHex(rgb) {
            let hex = "#";
            for (let value of rgb.split(',').map(n => +n)) {
                if (value > 255) return false;
                hex += componentToHex(value);
            }
            return hex;
        }

        function hexToRgb(hex) {
            //var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return `${parseInt(hex.substring(1, 3), 16)}, ${parseInt(hex.substring(3, 5), 16)}, ${parseInt(hex.substring(5, 7), 16)}`;
        }

        function randomColors(numberOfColors) {
            let colors = [];
            for (let i = 0; i < numberOfColors; i++) {
                randomColor = Math.floor(Math.random() * (16 ** 6)).toString(16)
                colors.push(`#${'0'.repeat(6 - randomColor.length)}${randomColor}`);
            }
            return colors;
        }
        
        let color = await axios.get(`https://www.thecolorapi.com/id?hex=${hex.slice(1)}&w=200`);
        console.log(color);
        console.log(color.data.image.named);


        const resultsEmbed = new Discord.MessageEmbed()
            .setColor(hex)
        // .setAuthor(`${heading} ${targetMember.nickname}`, targetMember.user.avatarURL())
            .setTitle(color.data.name.value)
            .addField("Hex: ", hex, true)
            .addField("RGB: ", rgb, true)
            .setThumbnail(`https://www.colorhexa.com/${color.data.hex.clean}.png`)
            .setImage(`https://www.colorhexa.com/${color.data.hex.clean}.png`)
            .setImage(`https://www.colorhexa.com/${color.data.hex.clean}.png`)
        // .addField("Total in channel", `${targetData.correct} ✅ ${targetData.incorrect} ❌ - ${totalPercentage}%`, true)
        // .setFooter(`Judge ${message.member.nickname}`, message.author.avatarURL());
        message.channel.send(resultsEmbed).catch(console.error);
    }
}
