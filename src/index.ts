import fs from 'fs';
import path, { parse } from 'path';
import { stringify } from 'yaml';
import { Builder } from 'xml2js';
import { write, utils } from 'xlsx';

type FileType = 'csv' | 'yaml' | 'xml' | 'xlsx' | 'txt';

function convertJson<T>(jsonData: any, schema: any, saveToFile: boolean = false, fileName: string = "data", fileType: FileType = "txt") {
    try {
        const result = byFileType(jsonData, schema, fileType);
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

function byFileType<T>(jsonData: any, schema: any, fileType: FileType) {
    switch (fileType) {
        case 'csv':
            return jsonToCsv(jsonData, schema);
        case 'yaml':
            return jsonToYaml(jsonData, schema);
        case 'xml':
            return jsonToXml(jsonData, schema);
        case 'xlsx':
            return jsonToXlsx(jsonData, schema);
        case 'txt':
            return jsonToTxt(jsonData, schema);
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
    if (typeof schema.safeParse === 'function') {
        return schema.safeParse(jsonData);
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
    } else {
        // במקרה של סכמה מותאמת אישית שאין לה safeParse או parse
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

function jsonToXml<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to XML:", formattedErrors);
        throw new Error(`XML Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;
    const builder = new Builder();
    const xmlData = builder.buildObject(data);

    return { success: true, fileData: xmlData };
}

function jsonToXlsx<T>(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) {
        const formattedErrors = formatErrors(parseData.errors);
        console.error("Error converting JSON to XLSX:", formattedErrors);
        throw new Error(`XLSX Conversion Error: ${formattedErrors.join(", ")}`);
    }

    const { data } = parseData;
    const dataArray = Array.isArray(data) ? data : [data];
    const worksheet = utils.json_to_sheet(dataArray);  // Use the array of objects
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

    // Convert the JSON data to a nicely formatted string
    const txtData = JSON.stringify(dataArray, null, 2);

    return { success: true, fileData: txtData };
}


function formatErrors(errors: any) {
    if (!errors) return ["Unknown error occurred! try checking your JSON"];
    return errors.map((err: any) => {
        const path = err.path.join('.');
        const message = err.message;
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

export { convertJson };