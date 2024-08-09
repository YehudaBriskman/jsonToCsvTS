```markdown
# Convert JSON Utility

## Description

`convert-json-util` is a versatile utility for converting JSON data into various formats such as CSV, YAML, XML, XLSX, and TXT. This tool is designed to make it easy to transform JSON data into different file types for use in data sharing, reporting, and more. It supports both [Zod](https://github.com/colinhacks/zod) schemas and custom schemas for validation and conversion.

## Installation

To install the package, use npm:

```sh
npm install convert-json-util
```

## Usage

### Importing the Module

To use the `convertJson` function, import it from the package:

```typescript
import { convertJson } from 'convert-json-util';
import { ZodSchema } from 'zod';
```

### Function Signature

```typescript
convertJson(jsonData: any, schema: any, saveToFile?: boolean, fileName?: string, fileType?: 'csv' | 'yaml' | 'xml' | 'xlsx' | 'txt'): { success: boolean, fileData?: string | Buffer, errors?: string[] }
```

### Parameters

- **jsonData**: The JSON data to be converted. It can be an object or an array of objects.
- **schema**: The schema used to validate the JSON data. This can be a Zod schema or any custom schema with `parse` or `safeParse` methods.
- **saveToFile** (optional): A boolean indicating whether to save the converted data to a file. Default is `false`.
- **fileName** (optional): The name of the file to save the converted data. Default is `"data"`.
- **fileType** (optional): The type of file to convert the data to. Options are `'csv'`, `'yaml'`, `'xml'`, `'xlsx'`, and `'txt'`. Default is `'csv'`.

### Return Value

The function returns an object with the following properties:
- **success**: A boolean indicating whether the conversion was successful.
- **fileData** (optional): The converted data as a string or Buffer. This is only present if `success` is `true`.
- **errors** (optional): An array of error messages. This is only present if `success` is `false`.

### Examples

#### Example 1: Converting JSON to CSV with Zod schema and saving to a file

```typescript
import { convertJson } from 'convert-json-util';
import { z } from 'zod';

// Define a Zod schema for the JSON data
const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email()
});

const jsonData = [
    { name: "John Doe", age: 30, email: "john.doe@example.com" },
    { name: "Jane Doe", age: 25, email: "jane.doe@example.com" }
];

const result = convertJson(jsonData, schema, true, "users", "csv");

if (result.success) {
    console.log("CSV file saved successfully.");
} else {
    console.error("Error converting JSON to CSV:", result.errors);
}
```

#### Example 2: Converting JSON to YAML without saving to a file using a custom schema

```typescript
import { convertJson } from 'convert-json-util';

// Define a custom schema for the JSON data
const customSchema = {
    parse: (jsonData: any) => {
        try {
            const data = JSON.parse(JSON.stringify(jsonData));
            return { success: true, data };
        } catch (error) {
            return { success: false, errors: [{ path: [], message: (error as Error).message }] };
        }
    }
};

const jsonData = { name: "John Doe", age: 30, email: "john.doe@example.com" };

const result = convertJson(jsonData, customSchema, false, "user", "yaml");

if (result.success) {
    console.log("YAML data:", result.fileData);
} else {
    console.error("Error converting JSON to YAML:", result.errors);
}
```

### Handling Errors

If an error occurs during conversion, the function will:
- Print the error message to the console using `console.error`.
- Include the error details in the returned object under the `errors` property.
- Throw an error to stop further execution, allowing it to be caught and handled by the calling code.

Example:

```typescript
try {
    const result = convertJson(invalidJsonData, schema, true, "invalidData", "csv");
} catch (error) {
    console.error("An error occurred during conversion:", error);
}
```

## Supported File Types

- **CSV**: Comma-separated values, useful for spreadsheets and data analysis.
- **YAML**: A human-readable data serialization format.
- **XML**: Extensible Markup Language, useful for structured data exchange.
- **XLSX**: Excel spreadsheet format, useful for advanced data analysis and reporting.
- **TXT**: Plain text format, useful for simple data storage and sharing.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```