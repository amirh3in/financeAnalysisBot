import fp from 'fastify-plugin';
import TelegramBot, { Message } from 'node-telegram-bot-api';
// import OpenAI from 'openai';
// import { HttpsProxyAgent } from "https-proxy-agent";
const token = '1876139614:AAEyayGhXSAhWdHOn7JQ0JJEkSexBaCE-AA';
// const agent = new HttpsProxyAgent('socks5://127.0.0.1:1080');
import { SocksProxyAgent } from 'socks-proxy-agent';  // Changed from HttpsProxyAgent
const agent = new SocksProxyAgent('socks://127.0.0.1:1080');  // Correct SOCKS5 agent

async function telegramPlugin(fastify: any, opts: any) {
    const bot = new TelegramBot(token, {
        polling: true,
        request: {
            agent: agent,
            url: 'socks://127.0.0.1:1080'
            // url: 'http:127.0.0.1:2081'
        }
    });

    // const openai = new OpenAI({
    //     baseURL: "https://api.aimlapi.com/v1",
    //     apiKey: 'f7f13adecab8416697a53a7f3cd36d19'
    // });
    // Listen for any kind of message. There are different kinds of messages.
    bot.on('message', async (msg: Message) => {
        console.log('messageeeeeeeeeeeee')
        const chatId = msg.chat.id;
        let response = "";

        // let message: string = msg.text ?? "";
        // const completion = await openai.chat.completions.create({
        //     messages: [
        //         {
        //             "role": "system",
        //             "content": "You are an AI assistant who knows everything.",
        //         },
        //         {
        //             "role": "user",
        //             "content": message
        //         },
        //     ],
        //     model: "gpt-4o",
        // });

        // console.log(completion.choices[0].message.content);
        switch (msg.chat.type) {
            case "private":
                if (msg.text?.indexOf('امین') != -1)
                    response = "امین پسر خیلی دوسداشتنی هستی"
                else
                    response = "سلام چیکار واست بکنم؟"
                break;
            case 'group':
            case "supergroup":

                if (msg.text?.indexOf('امین') != -1)
                    response = "امین پسر خیلی دوسداشتنی هستی"
                else if (msg.text.indexOf("چیه") != -1)
                    response = "یه کونیه"
                else if (msg.text.indexOf("کص") != -1 && msg.text.length < 40)
                    response = "خفه شو بی حیا" + msg.from?.first_name
                else if (msg.text.indexOf("کیر") != -1 && msg.text.length < 30)
                    response = "خیلی بی ادبی" + msg.from?.first_name
                else if (msg.text.indexOf("چیه") != -1 && msg.text.length < 15 && msg.text.split(" ").length == 2) {
                    response = msg.text.split(" ")[0] + " " + "یه کونیه";
                }
                else if (msg.reply_to_message && msg.text.length < 3) {
                    bot.sendMessage(chatId, `ریپلای نکن روش روساخته ${msg.reply_to_message.from?.first_name}`, { reply_to_message_id: msg.reply_to_message.message_id })
                    return;
                }

                break;

            default:
                break;
        }

        if (msg.chat.type == "private") {
            console.log(msg)

        }

        if (response && response != '' && response.trim() != '')
            bot.sendMessage(chatId, response);
    });

    fastify.decorate('telegramBot', bot);
}

export default fp(telegramPlugin);
