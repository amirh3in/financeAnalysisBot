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
            bot.sendMessage(-1001506299946, logMessage);

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
            bot.sendMessage(805717280, logMessage);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Log sent successfully:', data);
    } catch (error) {
        console.error('Error sending log:', error);
    }
}


export default sendLog;
