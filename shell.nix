{ pkgs ? import (fetchTarball
  "https://github.com/NixOS/nixpkgs/archive/83607dae4e05e1de755bbc7d7949b33fc1cfbbb9.tar.gz")
  { } }:

with pkgs;

mkShell {
  buildInputs = [
    yarn
    nodejs-16_x
    # tools for node-gyp
    python310
    cmake
    gcc
  ];
}
