import json
import sys
import re


def read_manifest(manifest_file: str) -> dict:
    with open(manifest_file, "r") as f:
        data: dict = json.load(f)
        return data


def write_manifest(manifest_file: str, manifest: dict) -> None:
    with open(manifest_file, "w") as f:
        f.write(json.dumps(manifest, indent=2))


def main(manifest_file: str, version: str) -> None:
    manifest: dict = read_manifest(manifest_file)
    manifest["version"] = version
    download = manifest["download"]
    manifest["download"] = re.sub(r"(?<=/releases/download/)[^/]*(?=/)", version, download)
    write_manifest(manifest_file, manifest)


if __name__ == '__main__':
    main("module.json", sys.argv[1])
