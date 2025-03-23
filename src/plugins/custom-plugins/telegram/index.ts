// import fp from 'fastify-plugin';
// import TelegramBot, { Message } from 'node-telegram-bot-api';
// import OpenAI from 'openai';

// const token = '1876139614:AAEyayGhXSAhWdHOn7JQ0JJEkSexBaCE-AA';

// async function telegramPlugin(fastify: any, opts: any) {
//     const bot = new TelegramBot(token, { polling: true });

//     const openai = new OpenAI({
//         baseURL: "https://api.aimlapi.com/v1",
//         apiKey: 'f7f13adecab8416697a53a7f3cd36d19'
//     });
//     // Listen for any kind of message. There are different kinds of messages.
//     bot.on('message', async (msg: Message) => {
//         console.log('messageeeeeeeeeeeee')
//         const chatId = msg.chat.id;
//         let response = "";

//         // let message: string = msg.text ?? "";
//         // const completion = await openai.chat.completions.create({
//         //     messages: [
//         //         {
//         //             "role": "system",
//         //             "content": "You are an AI assistant who knows everything.",
//         //         },
//         //         {
//         //             "role": "user",
//         //             "content": message
//         //         },
//         //     ],
//         //     model: "gpt-4o",
//         // });

//         // console.log(completion.choices[0].message.content);
//         switch (msg.chat.type) {
//             case "private":
//                 if (msg.text?.indexOf('طهورا') != -1)
//                     response = "طهورا بهترین فرشته روی زمینه"
//                 else
//                     response = "سلام چیکار واست بکنم؟"
//                 break;
//             case 'group':
//             case "supergroup":

//                 if (msg.reply_to_message) {
//                     console.log(msg)
//                     bot.sendMessage(chatId, `اذیتش نکن اشغال ${msg.reply_to_message.from?.first_name}`, { reply_to_message_id: msg.reply_to_message.message_id })
//                     return;
//                 } else {
//                     response = "افرین دوست باشین"
//                 }

//                 break;

//             default:
//                 break;
//         }

//         if (msg.chat.type == "private") {
//             console.log(msg)

//         }

//         bot.sendMessage(chatId, response);
//     });

//     fastify.decorate('telegramBot', bot);
// }

// export default fp(telegramPlugin);
