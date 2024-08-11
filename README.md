```markdown
# Convert JSON Utility

## Description

`convert-json-util` is a versatile utility for converting JSON data into various formats such as CSV, YAML, XML, XLSX, and TXT. This tool is designed to make it easy to transform JSON data into different file types for use in data sharing, reporting, and more. It supports validation using both [Zod](https://github.com/colinhacks/zod) schemas and custom schemas, and also allows conversion without any validation if no schema is provided.

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
convertJson(jsonData: any, schema?: any, saveToFile?: boolean, fileName?: string, fileType?: 'csv' | 'yaml' | 'xml' | 'xlsx' | 'txt'): { success: boolean, fileData?: string | Buffer, errors?: string[] }
```

### Parameters

- **jsonData**: The JSON data to be converted. It can be an object or an array of objects.
- **schema** (optional): The schema used to validate the JSON data. This can be a Zod schema, any custom schema with `parse`, `safeParse`, or `validate` methods, or it can be omitted entirely for conversion without validation.
- **saveToFile** (optional): A boolean indicating whether to save the converted data to a file. Default is `false`.
- **fileName** (optional): The name of the file to save the converted data. Default is `"data"`.
- **fileType** (optional): The type of file to convert the data to. Options are `'csv'`, `'yaml'`, `'xml'`, `'xlsx'`, and `'txt'`. Default is `'txt'`.

### Return Value

The function returns an object with the following properties:
- **success**: A boolean indicating whether the conversion was successful.
- **fileData** (optional): The converted data as a string or Buffer. This is only present if `success` is `true`.

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
console.log(result);
```

#### Example 2: Converting JSON to YAML without saving to a file using a custom schema

```typescript
import { convertJson } from 'convert-json-util';

// Define a custom schema for the JSON data
const customSchema = {
    validate: (data: any) => {
        const errors: string[] = [];
        if (typeof data.name !== 'string') {
            errors.push('Invalid type for name. Expected string.');
        }
        if (typeof data.age !== 'number') {
            errors.push('Invalid type for age. Expected number.');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof data.email !== 'string' || !emailRegex.test(data.email)) {
            errors.push('Invalid email format.');
        }
        if (errors.length > 0) {
            return { success: false, errors };
        }
        return { success: true, data };
    }
};

const jsonData = { name: "John Doe", age: 30, email: "john.doe@example.com" };

const result = convertJson(jsonData, customSchema, false, "user", "yaml");
console.log(result);
```

#### Example 3: Converting JSON to TXT without any validation

```typescript
import { convertJson } from 'convert-json-util';

const jsonData = { name: "John Doe", age: 30, email: "john.doe@example.com" };

const result = convertJson(jsonData, null, false, "user", "txt");
console.log(result);
```

### Handling Errors

If an error occurs during conversion, the function will:
- Print the error message to the console using `console.error`.
- Throw an error to stop further execution, allowing it to be caught and handled by the calling code.


## Supported File Types

- **CSV**: Comma-separated values, useful for spreadsheets and data analysis.
- **YAML**: A human-readable data serialization format.
- **XML**: Extensible Markup Language, useful for structured data exchange.
- **XLSX**: Excel spreadsheet format, useful for advanced data analysis and reporting.
- **TXT**: Plain text format, useful for simple data storage and sharing.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```