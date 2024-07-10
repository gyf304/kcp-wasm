{
	pkgs ? import <nixpkgs> {
		crossSystem = {
			config = "wasm32-unknown-wasi";
			useLLVM = true;
			libc = "wasilibc";
		};
	}
}:
  pkgs.clangStdenv.mkDerivation {
	name = "kcp-wasm";
	# nativeBuildInputs is usually what you want -- tools you need to run
	nativeBuildInputs = with pkgs.buildPackages; [
		bun
		# cross.buildPackages.clang
	];
	buildInputs = with pkgs; [
		wasilibc
	];
}
