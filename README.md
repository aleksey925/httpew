# httpew

Terminal HTTP client for [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) `.http` files.
Powered by [httpyac](https://httpyac.github.io/), runs in any terminal without an IDE.

- [Why httpew?](#why-httpew)
- [Installation](#installation)
- [Compatibility](#compatibility)
- [How to Use](#how-to-use)
  - [Environment Files](#environment-files)

## Why httpew?

- **Compatibility** — reuse your existing `.http` files from IntelliJ IDEA, WebStorm, GoLand, and other JetBrains IDEs without modification. Built on [httpyac](https://httpyac.github.io/), so it also supports everything httpyac can do: variables, scripting, request dependencies, GraphQL, WebSocket, gRPC, and more
- **Works outside the IDE** — browse, edit, and execute requests in any terminal: on a remote server, inside Docker, or on a machine without JetBrains installed
- **Interactive UI** — three-panel layout (request list, source, response), JSON highlighting, search, copy as curl, save responses, environment switching

## Installation

Download the latest release from [releases](https://github.com/aleksey925/httpew/releases) and install it manually
or you can run the following commands to install the latest version to `~/.local/bin`:

```bash
VERSION=$(curl -sL -o /dev/null -w '%{url_effective}' https://github.com/aleksey925/httpew/releases/latest | sed 's/.*\/v//')
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
curl -#L "https://github.com/aleksey925/httpew/releases/download/v${VERSION}/httpew-${VERSION}-${OS}-${ARCH}.tar.gz" | tar xz -C ~/.local/bin "httpew-${OS}-${ARCH}"
mv ~/.local/bin/httpew-${OS}-${ARCH} ~/.local/bin/httpew
```

Also, you can build it from source (requires [Bun](https://bun.sh)):

```bash
git clone https://github.com/aleksey925/httpew.git
cd httpew
make install  # compiles and copies to ~/.local/bin
```

Make sure `~/.local/bin` is in your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Compatibility

httpew uses [httpyac](https://httpyac.github.io/) as its HTTP engine. httpyac provides broad compatibility with the [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) `.http` file format, as well as its own extended syntax.

### Supported JetBrains HTTP Client features

| Feature                                                               | Status             | Notes                                                                 |
| --------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| Basic requests (GET, POST, PUT, DELETE, PATCH)                        | :white_check_mark: | Full support                                                          |
| Request headers                                                       | :white_check_mark: |                                                                       |
| Request body (JSON, form-data, multipart)                             | :white_check_mark: |                                                                       |
| Request separators (`###`)                                            | :white_check_mark: |                                                                       |
| `# @name` directive                                                   | :white_check_mark: |                                                                       |
| Variable substitution (`{{variable}}`)                                | :white_check_mark: |                                                                       |
| Environment files (`http-client.env.json`)                            | :white_check_mark: | Also supports `http-client.private.env.json`                          |
| Response handler scripts (`> {% ... %}`)                              | :white_check_mark: | `client.global.set/get`, `client.test`, `client.assert`, `client.log` |
| Pre-request scripts (`< {% ... %}`)                                   | :white_check_mark: | `request.variables`, `request.headers`, `request.body`                |
| `response.body`, `response.status`, `response.headers`                | :white_check_mark: |                                                                       |
| Dynamic variables (`$uuid`, `$timestamp`, `$isoTimestamp`)            | :white_check_mark: |                                                                       |
| `$random.*` (`integer`, `float`, `alphabetic`, `email`, `uuid`, etc.) | :white_check_mark: |                                                                       |
| `$env.VAR_NAME` (OS environment variables)                            | :white_check_mark: |                                                                       |
| Request dependencies (`# @ref`)                                       | :white_check_mark: |                                                                       |
| `# @disabled`, `# @no-cookie-jar`, `# @no-log`                        | :white_check_mark: |                                                                       |
| GraphQL requests                                                      | :white_check_mark: | Auto Content-Type                                                     |
| WebSocket, gRPC                                                       | :white_check_mark: |                                                                       |

### Not supported

Some [JetBrains HTTP Client JavaScript APIs](https://www.jetbrains.com/help/idea/javascript-api-supported-by-http-client.html) are not available in httpyac:

- [Crypto API](https://www.jetbrains.com/help/idea/http-client-crypto-api-reference.html) (`crypto.hmac`, `crypto.subtle`, `jwt.*`)
- Shell commands (`exec()`, `execFile()`)
- DOM methods for XML/HTML response parsing
- Global headers (`client.global.headers`)

### httpyac-native syntax

In addition to JetBrains format, httpyac supports its own syntax for response handlers and variables. Both formats can be used in the same project:

|                  | JetBrains syntax                                          | httpyac syntax                                    |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Response handler | `> {% client.global.set("token", response.body.token) %}` | `{{ $global.token = response.parsedBody.token }}` |
| Response body    | `response.body`                                           | `response.parsedBody`                             |
| Assertions       | `client.test("name", fn)`                                 | `const assert = require('assert')`                |

See [httpyac documentation](https://httpyac.github.io/) for full details.

## How to Use

```bash
httpew                          # start with file browser
httpew requests.http            # open file directly
```

### Environment Files

httpew looks for environment files in the same directory as the `.http` file (or parent directories):

| File                           | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| `http-client.env.json`         | Shared variables, safe to commit               |
| `http-client.private.env.json` | Secrets (tokens, passwords), **do not commit** |

Private values override public ones. Both files use the same format:

```json
{
  "dev": {
    "host": "https://dummyjson.com",
    "token": "secret"
  },
  "prod": {
    "host": "https://api.example.com",
    "token": "secret"
  }
}
```

Variables are referenced in requests as `{{host}}`, `{{token}}`, etc. Switch environments with `E` inside the app.
