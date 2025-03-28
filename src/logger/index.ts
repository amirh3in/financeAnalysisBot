import TelegramBot from "node-telegram-bot-api";

const sendLog = async (title: string, message: string, candle: any = null, bot?: TelegramBot) => {
    const now = new Date();
    const time = now.toLocaleString(); // Format the time as ISO string

    // Create the log object
    const log = {
        time: time,
        title: title,
        message: message,
        candle: candle
    };

    // Construct the URL with query parameters
    const url = new URL('https://eitaayar.ir/api/bot204817:147f2e2d-1ee2-4ab1-a346-3e08d345749f/sendMessage');

    let logMessage = `Title: ${log.title}\n⌚Time: ${log.time}\n📫Message: ${log.message}\n📝Candle: ${log.candle}`;
    url.searchParams.append('chat_id', '10525463');
    url.searchParams.append('text', logMessage);
    url.searchParams.append('date', '0');
    // url.searchParams.append('pin', 'on');
    url.searchParams.append('parse_mode', '');
    url.searchParams.append('viewCountForDelete', '');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET'
        });


        if (bot)
            await sendTelegramLog(bot, -1001506299946, logMessage);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Log sent successfully:', data);
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

export const loginfo = async (message: string, bot?: TelegramBot) => {

    const time = new Date().toLocaleString(); // Format the time as ISO string

    let logMessage = `Title: info\n⌚Time: ${time}\n📫Message: ${message}`;

    // Construct the URL with query parameters
    const url = new URL('https://eitaayar.ir/api/bot204817:147f2e2d-1ee2-4ab1-a346-3e08d345749f/sendMessage');
    url.searchParams.append('chat_id', '9400341');
    url.searchParams.append('text', logMessage);
    url.searchParams.append('date', '0');
    // url.searchParams.append('pin', 'on');
    url.searchParams.append('parse_mode', '');
    url.searchParams.append('viewCountForDelete', '');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET'
        });

        if (bot)
            await sendTelegramLog(bot, 805717280, logMessage);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Log sent successfully:', data);
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

let logs: [{ message?: string, bot?: TelegramBot, groupId?: number }] | any;

(() => {

    setInterval(() => {
        if (logs && logs.length != 0) {
            try {
                logs.forEach(async (item: any) => {
                    if (item.bot && item.message) {
                        let res = await sendTelegramLog(item.bot, -1001506299946, item.message)

                        if (res)
                            logs = logs.filter((x: any) => x.message != item.message);
                    }
                })
            } catch (err: any) {
                loginfo("sending logs went wrong: " + JSON.stringify(err), logs[0].bot)
            }
        }
    }, 10000);
})()
const sendTelegramLog = async (bot: TelegramBot, groupId: number, message: string) => {
    try {
        await bot.sendMessage(groupId, message);

        return true;
    } catch (err: any) {
        logs ??= [];
        logs.push({ message: message, bot: bot, groupId: groupId })
        loginfo("telegram calling went wrong error:" + JSON.stringify(err))
    }

    return false;
}


export default sendLog;
