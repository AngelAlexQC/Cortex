{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.bun
    pkgs.nodejs_20
    pkgs.python3
  ];
  idx = {
    extensions = [
      "EcuaByte.cortex-vscode"
    ];
    workspace = {
      onCreate = {
        install-deps = "bun install";
      };
      onStart = {
        build = "bun run build";
      };
    };
  };
}
