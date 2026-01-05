# Universal Cortex Setup Guide

Cortex is designed to work as a **Universal Memory Layer** for any AI-powered development environment. While it has a dedicated [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode), you can also use it with **Cursor**, **Windsurf**, **Claude Code**, **Goose**, **JetBrains**, and **Neovim** via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

## 🚀 Quick Setup (All Tools)

We provide a utility to generate the configuration for your specific tool.

1.  **Install Cortex MCP Server**:
    ```bash
    npm install -g @ecuabyte/cortex-mcp-server
    # OR
    bun add -g @ecuabyte/cortex-mcp-server
    ```

2.  **Generate Config**:
    Run the following command to get the config block for your tool:
    ```bash
    # For Cursor
    cortex-mcp generate-config --target cursor

    # For Claude Desktop
    cortex-mcp generate-config --target claude

    # For Windsurf
    cortex-mcp generate-config --target windsurf
    ```

---

## 🛠 Manual Configuration

If you prefer to configure manually, follow the instructions for your specific tool below.

### 1. Cursor / Windsurf / VSCodium (OpenVSX)

These editors support VS Code extensions but use the [Open VSX Registry](https://open-vsx.org/).

1.  Open the **Extensions** panel.
2.  Search for `Cortex` (or ID: `EcuaByte.cortex-vscode`).
3.  Install **Cortex: AI Memory** published by `EcuaByte`.

**Troubleshooting: Extension not found?**
 In some restricted environments (like corporate networks or older IDE versions), the search might fail.
*   **Solution**: Download the `.vsix` from [GitHub Releases](https://github.com/EcuaByte-lat/Cortex/releases) and drag-and-drop it into the extensions panel.

**Alternative (Native MCP):**
If you want to use the MCP server directly (e.g., for Composer in Cursor):
1.  Open `Cursor Settings` > `General` > `MCP`.
2.  Add a new server:
    *   **Name**: `cortex`
    *   **Type**: `command`
    *   **Command**: `npx` (or full path to node)
    *   **Args**: `-y @ecuabyte/cortex-mcp-server`

    *   **Args**: `-y @ecuabyte/cortex-mcp-server`
    
### 2. Google IDX

Cortex works natively in Google IDX. Add it to your `.idx/dev.nix` file:

```nix
{ pkgs, ... }: {
  idx = {
    extensions = [
      "EcuaByte.cortex-vscode"
    ];
  };
}
```

*Note: If the extension search fails, you can drag and drop the `.vsix` from our [Releases page](https://github.com/EcuaByte-lat/Cortex/releases).*

### 3. Claude Desktop

To give Claude Desktop access to your project memories:

1.  Open your config file:
    *   **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  Add `cortex` to the `mcpServers` object:
    ```json
    {
      "mcpServers": {
        "cortex": {
          "command": "npx",
          "args": [
            "-y",
            "@ecuabyte/cortex-mcp-server"
          ]
        }
      }
    }
    ```

### 3. JetBrains (IntelliJ, WebStorm, PyCharm)

JetBrains AI Assistant supports MCP (since 2025.2).

1.  Open **Settings/Preferences** > **Tools** > **Model Context Protocol**.
2.  Click **+** to add a server.
3.  Select **stdio** transport.
4.  **Command**: `npx`
5.  **Args**: `-y @ecuabyte/cortex-mcp-server`
6.  Restart the AI Assistant if necessary.

### 4. Neovim

Use [`avante.nvim`](https://github.com/yetone/avante.nvim) or similar AI plugins that support MCP.

**Example `avante.nvim` setup:**
```lua
{
  "yetone/avante.nvim",
  opts = {
    -- ... other config
    mcp_servers = {
      cortex = {
        command = "npx",
        args = { "-y", "@ecuabyte/cortex-mcp-server" },
      },
    },
  },
}
```

### 5. Goose / Gemini Code Assist

Most command-line agents simply require you to register the MCP server.

**Goose:**
```bash
goose configure mcp add cortex "npx -y @ecuabyte/cortex-mcp-server"
```
