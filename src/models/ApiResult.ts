export type ApiResult<T = any> = {
    isSuccess: boolean;
    message: string;
    code: number;
    errors: {
        message: string
        reasons: string[]
    }[]
    value?: T
}


export const makeRes = <T>(isSuccess: boolean = true, data?: T, message?: string, code?: number): ApiResult<T> => {
    const resultMessage = isSuccess ? 'operation was successfull' : message ? message : 'operation failed!';
    const statusCode = isSuccess ? 200 : code ? code : 400;
    return {
        isSuccess: true,
        message: resultMessage,
        errors: [],
        value: data,
        code: statusCode
    }
}
