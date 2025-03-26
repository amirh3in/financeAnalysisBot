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


export async function logTextFile({ data, title, caption = '' }: SendTextOptions): Promise<ApiResponse> {
    let tempFilePath: string | null = null;

    try {
        // 1. Format the data beautifully based on its type
        let formattedText: string;

        if (typeof data === 'string') {
            // If it's already a string, try to parse it as JSON for formatting
            try {
                const parsed = JSON.parse(data);
                formattedText = JSON.stringify(parsed, null, 2);
            } catch {
                // If not JSON, use as-is
                formattedText = data;
            }
        } else if (typeof data === 'object') {
            // Format objects with nice indentation
            formattedText = JSON.stringify(data, null, 2);

            // Add type information for arrays
            if (Array.isArray(data)) {
                formattedText = `// Array with ${data.length} items\n${formattedText}`;
            }
        } else {
            // Convert other types (numbers, booleans) to string
            formattedText = String(data);
        }

        // 2. Create a temporary file with appropriate extension
        const extension = typeof data === 'object' ? 'json' : 'txt';
        tempFilePath = path.join(__dirname, 'temp', `${title.replace(/\s+/g, '_')}_${Date.now()}.${extension}`);

        // Ensure temp directory exists
        if (!fs.existsSync(path.dirname(tempFilePath))) {
            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
        }

        // 3. Write formatted data to file
        fs.writeFileSync(tempFilePath, formattedText);

        // 4. Prepare form data for API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('chat_id', apiConfig.chatId);
        formData.append('title', title);
        formData.append('caption', caption);
        formData.append('date', Math.floor(Date.now() / 1000) + 30);

        // 5. Send to API
        const response = await axios.post(
            `${apiConfig.apiUrl}/${apiConfig.token}/sendFile`,
            formData,
            {
                headers: formData.getHeaders(),
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        return {
            success: false,
            message: axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : error instanceof Error
                    ? error.message
                    : 'Unknown error'
        };
    } finally {
        // 6. Clean up temp file if it exists
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}
