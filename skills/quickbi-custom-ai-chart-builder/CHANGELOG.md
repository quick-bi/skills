# Changelog

## [0.1.0] - 2026-09-02

### Fixed

- Clarified `url` as required in `external_assets` entries: the curl and JSON examples in mcp-api.md previously showed echarts with only `{name, global}`, and the field table marked it as `url?`, contradicting externals.md. Confirmed that omitting `url` causes the component to fail with "no resource address: the API layer did not provide a url, and it is not a sandbox built-in module." Both examples and both field tables are now unified to include `url`, a `url` generation rule has been added (exact entry path first, otherwise `{name}@{version}`), and a corresponding row has been added to the troubleshooting table (can be fixed via the update API with `external_assets` only, `revisionChanged: false`, no artifact change).
- Rewrote the CORS entry in the troubleshooting table: the original text stating "devServer needs `Access-Control-Allow-Origin: *`" was misleading — the qdt devServer already ships with full CORS headers (including `Access-Control-Allow-Private-Network`). "Permission was denied ... `loopback` address space" indicates the request went over `http://` (same-page test: https to loopback returns 200, http is rejected); the root cause remains an untrusted self-signed certificate.

## [0.0.1] - 2026-08-25

- Placeholder skill created; workflow not authored yet.
