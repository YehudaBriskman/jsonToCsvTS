import fs from 'fs';
import path from 'path';
import { stringify } from 'yaml';
import { Builder } from 'xml2js';
import {write,utils} from 'xlsx';
import { ZodSchema } from 'zod';

type FileType = 'csv' | 'yaml' | 'xml' | 'xlsx' | 'txt' ;

function convertJson(jsonData: any, schema: ZodSchema<any>, saveToFile: boolean = false, fileName: string = "data", fileType: FileType = "csv") {
    const result = byFileType(jsonData, schema, fileType);
    if (saveToFile && result.success) {
        const outputDir = path.resolve('files');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        const outputFilePath = getUniqueFilePath(outputDir, `${fileName}.${fileType}`);
        fs.writeFileSync(outputFilePath, result.fileData);
        console.log(`${fileType.toUpperCase()} file saved to`, outputFilePath);
    }
    return result;
}

function byFileType(jsonData: any, schema: any, fileType: FileType) {
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
            return jsonToCsv(jsonData, schema);
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

function parseWithSchema(schema: any, jsonData: any) {
    if (schema.safeParse) {
        return schema.safeParse(jsonData);
    } else if (schema.parse) {
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
        return { success: false, errors: ['Unsupported schema type'] };
    }
}

function jsonToCsv(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) return { success: false, errors: formatErrors(parseData.errors) };

    const { data } = parseData;

    let dataArray: any[];
    if (Array.isArray(data)) {
        dataArray = data;
    } else if (typeof data === 'object' && data !== null) {
        dataArray = [data];
    } else {
        return { success: false, errors: ['JSON data is neither an array nor an object'] };
    }

    if (dataArray.length === 0) {
        return { success: false, errors: ['JSON data array is empty'] };
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

function jsonToYaml(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) return { success: false, errors: formatErrors(parseData.errors) };

    const { data } = parseData;
    const yamlData = stringify(data);

    return { success: true, fileData: yamlData };
}

function jsonToXml(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) return { success: false, errors: formatErrors(parseData.errors) };

    const { data } = parseData;
    const builder = new Builder();
    const xmlData = builder.buildObject(data);

    return { success: true, fileData: xmlData };
}

function jsonToXlsx(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) return { success: false, errors: formatErrors(parseData.errors) };

    const { data } = parseData;
    const dataArray = Array.isArray(data) ? data : [data];
    const worksheet = utils.json_to_sheet(dataArray);  // Use the array of objects
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const xlsxData = write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, fileData: xlsxData };
}

function jsonToTxt(jsonData: any, schema: any) {
    const parseData = parseWithSchema(schema, jsonData);
    if (!parseData.success) return { success: false, errors: formatErrors(parseData.errors) };

    const { data } = parseData;

    let dataArray: any[];
    if (Array.isArray(data)) {
        dataArray = data;
    } else if (typeof data === 'object' && data !== null) {
        dataArray = [data];
    } else {
        return { success: false, errors: ['JSON data is neither an array nor an object'] };
    }

    if (dataArray.length === 0) {
        return { success: false, errors: ['JSON data array is empty'] };
    }

    // Convert the JSON data to a nicely formatted string
    const txtData = JSON.stringify(dataArray, null, 2);

    return { success: true, fileData: txtData };
}

function formatErrors(errors: any) {
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
