import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';


interface SendTextOptions {
    data: string | object;
    title: string;
    caption?: string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export const apiConfig = {
    token: 'bot204817:147f2e2d-1ee2-4ab1-a346-3e08d345749f',
    chatId: '9400341',
    apiUrl: 'https://eitaayar.ir/api'
};
let tempFilePath: string;

export async function logTextFile({ data, title, caption = '' }: SendTextOptions): Promise<ApiResponse> {
    try {
        // Convert data to string if it's an object
        const textData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

        // Create a temporary file path
        tempFilePath = path.join(__dirname, 'temp', `${title.replace(/\s+/g, '_')}_${Date.now()}.txt`);

        // Ensure temp directory exists
        if (!fs.existsSync(path.dirname(tempFilePath))) {
            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true })
        }

        // Write data to file
        fs.writeFileSync(tempFilePath, textData);

        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('chat_id', apiConfig.chatId);
        formData.append('title', title);
        formData.append('caption', caption);
        formData.append('date', Math.floor(Date.now() / 1000) + 30);

        // Send to API
        const response = await axios.post(
            `${apiConfig.apiUrl}/${apiConfig.token}/sendFile`,
            formData,
            {
                headers: formData.getHeaders(),
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            }
        );

        // Clean up
        fs.unlinkSync(tempFilePath);

        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        // Clean up temp file if it exists
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        return {
            success: false,
            message: axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : error instanceof Error
                    ? error.message
                    : 'Unknown error'
        };
    }
}
