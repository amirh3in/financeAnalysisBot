const sendLog = async (title: string, message: string) => {
    const now = new Date();
    const time = now.toISOString(); // Format the time as ISO string

    // Create the log object
    const log = {
        time: time,
        title: title,
        message: message
    };

    // Construct the URL with query parameters
    const url = new URL('https://eitaayar.ir/api/bot204817:147f2e2d-1ee2-4ab1-a346-3e08d345749f/sendMessage');
    url.searchParams.append('chat_id', '10525463');
    url.searchParams.append('text', `🔥⛄Title: ${log.title}\nTime: ${log.time}\nMessage: 🔥🔥${log.message}`);
    url.searchParams.append('date', '0');
    url.searchParams.append('parse_mode', '');
    url.searchParams.append('viewCountForDelete', '');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET'
        });

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
