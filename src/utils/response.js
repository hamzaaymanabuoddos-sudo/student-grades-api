// Consistent JSON responses. Database columns are snake_case (credit_hours),
// JavaScript/JSON convention is camelCase (creditHours). We convert on the way out.
function camelize(value) {
  if (Array.isArray(value)) return value.map(camelize);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), camelize(v)])
    );
  }
  return value; // numbers, strings, Dates, null...
}

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data: camelize(data) });
}

module.exports = { ok, camelize };
