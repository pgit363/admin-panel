// Helpers shared across the vendor-products screens.

// Field types supported by a product category's attribute_schema (doc §5.1)
export const ATTR_TYPES = ['string', 'text', 'int', 'decimal', 'bool', 'enum', 'multi', 'date', 'time'];

// Attribute keys the backend refuses — anything that varies by date belongs to
// pricing/availability, not attributes (doc §5.1).
export const RESERVED_KEYS = [
  'price', 'sale_price', 'base_price', 'stock', 'currency',
  'availability', 'slots', 'booked', 'quantity_available', 'available_dates',
];

export const isSnakeCase = (key) => /^[a-z][a-z0-9_]*$/.test(key);

// Render a stored attribute value for review, given its schema definition.
export const formatAttrValue = (value, def) => {
  if (value == null || value === '') return '—';
  const type = def?.type;
  if (type === 'bool') return value ? 'Yes' : 'No';
  if (type === 'multi' && Array.isArray(value)) return value.join(', ');
  return String(value);
};

// Pair a product's `attributes` object with its category `attribute_schema`
// into label/value rows for the review modal. Falls back to the raw key when
// the schema has no matching entry.
export const attributeRows = (attributes, schema) => {
  if (!attributes || typeof attributes !== 'object') return [];
  return Object.entries(attributes).map(([key, value]) => {
    const def = schema?.[key];
    return {
      key,
      label: def?.label || key,
      value: formatAttrValue(value, def),
    };
  });
};
