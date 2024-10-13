import fs from 'fs';
import path from 'path';

type FileType = 'csv' | 'yaml' | 'xml' | 'xlsx' | 'txt' | 'json';

interface ConvertJsonOptions {
    jsonData: any;
    schema?: any;
    saveToFile?: boolean;
    fileName?: string;
    fileType?: FileType;
}

function convertJson<T>({ jsonData, schema = null, saveToFile = false, fileName = "data", fileType = "txt" }: ConvertJsonOptions) {
    try {
        const result = byFileType(jsonData, schema, fileType, fileName);
        if (saveToFile && result.success) {
            const outputDir = path.resolve('files');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
            const outputFilePath = getUniqueFilePath(outputDir, `${fileName}.${fileType}`);
            fs.writeFileSync(outputFilePath, result.fileData);
            console.log(`${fileType.toUpperCase()} file saved to`, outputFilePath);
        }

        return result;
    } catch (error) {
        console.error("An error occurred during conversion:", error);
        throw error;
    }
}

function byFileType<T>(jsonData: any, schema: any, fileType: FileType, fileName: string) {
    switch (fileType) {
        case 'csv':
            return jsonToCsv(jsonData, schema);
        case 'yaml':
            return jsonToYaml(jsonData, schema);
        case 'xml':
            return jsonToXml(jsonData, schema, fileName);
        case 'xlsx':
            return jsonToXlsx(jsonData, schema, fileName);
        case 'txt':
            return jsonToTxt(jsonData, schema);
        case 'json':
            return jsonToJaon(jsonData, schema);
        default:
            return jsonToTxt(jsonData, schema);
    }
}

function getUniqueFilePath(directory: string, fileName: string): string {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    let uniqueFileName = fileName;
    let counter = 1;

    while (fs.existsSync(path.join(directory, uniqueFileName))) {
        uniqueFileName = `${baseName}(${counter})${ext}`;
        counter++;
    }

    return path.join(directory, uniqueFileName);
}

function parseWithSchema<T>(schema: any, jsonData: any) {
    if (!schema) {
        return { success: true, data: jsonData };
    }

    if (typeof schema.safeParse === 'function') {
        const result = schema.safeParse(jsonData);
        if (!result.success) {
            return { success: false, errors: result.error.errors.map((err: any) => ({ path: err.path, message: err.message })) };
        }
        return { success: true, data: result.data };
    } else if (typeof schema.parse === 'function') {
        try {
            const data = schema.parse(jsonData);
            return { success: true, data };
        } catch (error) {
            if (error instanceof Error) {
                return { success: false, errors: [{ path: [], message: error.message }] };
            } else {
                return { success: false, errors: [{ path: [], message: 'An unknown error occurred' }] };
            }
        }
    } else if (typeof schema.validate === 'function') {
        const validationResult = schema.validate(jsonData);
        if (!validationResult.success) {
            return { success: false, errors: validationResult.errors.map((error: string) => ({ path: [], message: error })) };
        }
        return { success: true, data: validationResult.data };
    } else {
        try {
            const data = JSON.parse(JSON.stringify(jsonData));
            return { success: true, data };
        } catch (error: any) {
            return { success: false, errors: [{ path: [], message: error.message }] };
        }
    }
}

function jsonToCsv<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to CSV:", formattedErrors);
        throw new Error(`CSV Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;

    let dataArray: any[];
    if (Array.isArray(data)) {
        dataArray = data;
    } else if (typeof data === 'object' && data !== null) {
        dataArray = [data];
    } else {
        const errorMessage = 'JSON data is neither an array nor an object';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    if (dataArray.length === 0) {
        const errorMessage = 'JSON data array is empty';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const headers = extractHeaders(dataArray);
    const headerLine = headers.join(',') + '\n';
    let csvData = headerLine;

    dataArray.forEach(item => {
        const values = headers.map(header => {
            const value = getValueFromPath(item, header);
            if (Array.isArray(value) || typeof value === 'object') {
                return '"' + `${formatComplexValue(value)}` + '"';
            } else {
                return '"' + `${value}` + '"';
            }
        }).join(',');
        csvData += values + '\n';
    });

    return { success: true, fileData: csvData };
}

function jsonToYaml<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to YAML:", formattedErrors);
        throw new Error(`YAML Conversion Error: ${formattedErrors.join(", ")}`);
    }
    const { data } = parseData;
    const yamlData = stringify(data);

    return { success: true, fileData: yamlData };
}

function jsonToXml<T>(jsonData: any, schema: any, rootName: string) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to XML:", formattedErrors);
        throw new Error(`XML Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;
    const xmlData = XmlBuilder(data, rootName);

    return { success: true, fileData: xmlData };
}

function jsonToXlsx<T>(jsonData: any, schema: any, rootName: string) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to XLSX:", formattedErrors);
        throw new Error(`XLSX Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;
    const dataArray = Array.isArray(data) ? data : [data];
    const worksheet = utils.json_to_sheet(dataArray);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const xlsxData = write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, fileData: xlsxData };
}

function jsonToTxt<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to TXT:", formattedErrors);
        throw new Error(`TXT Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;

    let dataArray: any[];
    if (Array.isArray(data)) {
        dataArray = data;
    } else if (typeof data === 'object' && data !== null) {
        dataArray = [data];
    } else {
        const errorMessage = 'JSON data is neither an array nor an object';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    if (dataArray.length === 0) {
        const errorMessage = 'JSON data array is empty';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const txtData = JSON.stringify(dataArray, null, 2);

    return { success: true, fileData: txtData };
}

function jsonToJaon<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to JAON:", formattedErrors);
        throw new Error(`JAON Conversion Error: ${formattedErrors.join(", ")}`);
    }
    return { success: true, fileData: parseData.data };
}

function formatErrors(errors: any) {
    if (!errors || errors.length === 0) return ["Unknown error occurred! try checking your JSON"];
    return errors.map((err: any) => {
        const path = err.path && err.path.length > 0 ? err.path.join('.') : 'unknown path';
        const message = err.message || 'No message provided';
        return `Validation error at "${path}": ${message}`;
    });
}

function extractHeaders(dataArray: any[]) {
    const headers = new Set<string>();

    const extract = (obj: any, prefix: string = '') => {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                extract(value, newPrefix);
            } else {
                headers.add(newPrefix);
            }
        });
    };

    dataArray.forEach(item => extract(item));
    return Array.from(headers);
}

function getValueFromPath(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function formatComplexValue(value: any): string {
    if (Array.isArray(value)) {
        return value.map(v => formatComplexValue(v)).join(', ');
    } else if (typeof value === 'object' && value !== null) {
        return "{" + Object.entries(value).map(([key, val]) => `${key}: ${formatComplexValue(val)}`).join(',') + "}";
    } else {
        return value;
    }
}

function stringify(obj: any, indentLevel: number = 0): string {
    const indent = ' '.repeat(indentLevel * 2);
    let yamlStr = '';

    if (obj === null) {
        return 'null\n';
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (typeof item === 'object' && item !== null) {
                yamlStr += `${indent}- ${stringify(item, indentLevel + 1).trim()}\n`;
            } else {
                yamlStr += `${indent}- ${formatPrimitive(item)}\n`;
            }
        }
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                yamlStr += `${indent}${key}:\n${stringify(value, indentLevel + 1)}`;
            } else {
                yamlStr += `${indent}${key}: ${formatPrimitive(value)}\n`;
            }
        }
    } else {
        yamlStr += `${indent}${formatPrimitive(obj)}\n`;
    }

    return yamlStr;
}

function formatPrimitive(value: any): string {
    if (typeof value === 'string') {
        if (isMultilineString(value)) {
            return `|\n  ${value.split('\n').join('\n  ')}`;
        }
        return value.includes(':') || value.includes('"') || value.includes("'") || value.includes('\n')
            ? `"${value.replace(/"/g, '\\"')}"`
            : value;
    } else if (typeof value === 'number') {
        return value.toString();
    } else if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    } else if (value === null) {
        return 'null';
    } else {
        return value.toString();
    }
}

function isMultilineString(str: string): boolean {
    return str.includes('\n');
}

function XmlBuilder(obj: any, rootElement: string = 'data'): string {
    function buildXml(obj: any): string {
        let xml = '';

        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const key in obj) {
                const value = obj[key];

                if (Array.isArray(value)) {
                    value.forEach((item) => {
                        xml += `<${key}>${buildXml(item)}</${key}>`;
                    });
                } else if (typeof value === 'object' && value !== null) {
                    xml += `<${key}>${buildXml(value)}</${key}>`;
                } else {
                    xml += `<${key}>${escapeXml(value)}</${key}>`;
                }
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item) => {
                xml += `<item>${escapeXml(item)}</item>`;
            });
        } else {
            xml += escapeXml(obj);
        }

        return xml;
    }

    function escapeXml(value: any): string {
        if (typeof value !== 'string') return String(value);
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    let xmlResult = '';
    if (rootElement) {
        xmlResult += `<${rootElement}>`;
        xmlResult += buildXml(obj);
        xmlResult += `</${rootElement}>`;
    } else {
        xmlResult += buildXml(obj);
    }

    return xmlResult.trim();
}

interface Sheet {
    [cell: string]: any;
}

interface Workbook {
    Sheets: { [sheetName: string]: Sheet };
    SheetNames: string[];
}

function write(workbook: Workbook, options: { type: 'buffer' | 'binary' | 'string', bookType: 'xlsx' } = { type: 'buffer', bookType: 'xlsx' }): any {
    if (options.bookType !== 'xlsx') {
        throw new Error('Currently, only xlsx format is supported.');
    }

    const buffer = generateXlsxBuffer(workbook);

    if (options.type === 'buffer') {
        return buffer;
    } else if (options.type === 'binary') {
        return buffer.toString('binary');
    } else if (options.type === 'string') {
        return buffer.toString('base64');
    } else {
        throw new Error(`Unknown output type: ${options.type}`);
    }
}

function generateXlsxBuffer(workbook: Workbook): Buffer {
    const mockData = 'This is a mock xlsx buffer';
    return Buffer.from(mockData, 'utf-8');
}

const utils = {
    json_to_sheet(jsonData: any[]): Sheet {
        const sheet: Sheet = {};

        const headers = Object.keys(jsonData[0]);
        headers.forEach((header, index) => {
            const cellRef = String.fromCharCode(65 + index) + '1'; // 'A1', 'B1', וכו'
            sheet[cellRef] = { v: header };
        });

        jsonData.forEach((row, rowIndex) => {
            headers.forEach((header, colIndex) => {
                const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 2); // 'A2', 'B2', וכו'
                sheet[cellRef] = { v: row[header] };
            });
        });

        return sheet;
    },

    book_new(): Workbook {
        return { Sheets: {}, SheetNames: [] };
    },

    book_append_sheet(workbook: Workbook, sheet: Sheet, sheetName: string): void {
        workbook.Sheets[sheetName] = sheet;
        workbook.SheetNames.push(sheetName);
    }
};

export { convertJson };

