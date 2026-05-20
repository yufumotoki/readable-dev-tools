function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function mergeTypes(types) {
  return [...new Set(types)].sort();
}

function schemaFor(value) {
  const type = typeOf(value);
  if (type === "array") {
    const itemSchemas = value.map(schemaFor);
    const itemTypes = mergeTypes(itemSchemas.map((schema) => schema.type).flat());
    return {
      type: "array",
      items: itemSchemas.length ? mergeSchemas(itemSchemas) : {},
      "x-itemTypes": itemTypes,
    };
  }
  if (type === "object") {
    const properties = {};
    const required = [];
    Object.entries(value).forEach(([key, child]) => {
      properties[key] = schemaFor(child);
      if (child !== null) required.push(key);
    });
    return { type: "object", properties, required };
  }
  return { type };
}

function mergeSchemas(schemas) {
  if (schemas.length === 1) return schemas[0];
  const types = mergeTypes(schemas.map((schema) => schema.type).flat());
  if (types.length > 1) return { type: types };
  const type = types[0];
  if (type === "object") {
    const properties = {};
    const keyCounts = new Map();
    schemas.forEach((schema) => {
      Object.entries(schema.properties || {}).forEach(([key, value]) => {
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
        properties[key] = properties[key] ? mergeSchemas([properties[key], value]) : value;
      });
    });
    return {
      type: "object",
      properties,
      required: [...keyCounts.entries()].filter(([, count]) => count === schemas.length).map(([key]) => key),
    };
  }
  if (type === "array") {
    return { type: "array", items: mergeSchemas(schemas.map((schema) => schema.items || {})) };
  }
  return { type };
}

function tsTypeFromSchema(schema, name = "GeneratedType", depth = 0) {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);
  if (Array.isArray(schema.type)) return schema.type.map((type) => tsTypeFromSchema({ ...schema, type }, name, depth)).join(" | ");
  if (schema.type === "null") return "null";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "number") return "number";
  if (schema.type === "string") return "string";
  if (schema.type === "array") return `${tsTypeFromSchema(schema.items || {}, name, depth)}[]`;
  if (schema.type === "object") {
    const required = new Set(schema.required || []);
    const fields = Object.entries(schema.properties || {}).map(([key, child]) => {
      const optional = required.has(key) ? "" : "?";
      return `${nextIndent}${JSON.stringify(key).replace(/^"|"$/g, "")}${optional}: ${tsTypeFromSchema(child, key, depth + 1)};`;
    });
    return `{\n${fields.join("\n")}\n${indent}}`;
  }
  return "unknown";
}

export function generateJsonSchema(input) {
  try {
    const parsed = JSON.parse(String(input || "").trim());
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "GeneratedSchema",
      ...schemaFor(parsed),
    };
    const ts = `type GeneratedType = ${tsTypeFromSchema(schema)};`;
    return [
      "[SUMMARY]",
      "Status: Generated",
      `Root type: ${Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type}`,
      `Top-level keys: ${schema.properties ? Object.keys(schema.properties).length : 0}`,
      "",
      "[JSON SCHEMA]",
      JSON.stringify(schema, null, 2),
      "",
      "[TYPESCRIPT TYPE]",
      ts,
    ].join("\n");
  } catch (error) {
    return [
      "[SUMMARY]",
      "Status: Invalid JSON",
      `Error: ${error.message}`,
      "",
      "[WARNING]",
      "Paste valid JSON to generate JSON Schema and TypeScript types.",
    ].join("\n");
  }
}
