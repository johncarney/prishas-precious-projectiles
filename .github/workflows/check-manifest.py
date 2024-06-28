#!/usr/bin/env python3

import json


class Manifest:
    def __init__(self, file: str):
        self._file = file


    @property
    def manifest(self) -> dict:
        if not hasattr(self, "_manifest"):
            with open(self._file, "r") as f:
                self._manifest = json.load(f)
        return self._manifest


    @property
    def version(self) -> str:
        return self.manifest["version"]


    @property
    def download(self) -> str:
        return self.manifest["download"]


    @property
    def download_version(self) -> str:
        if not hasattr(self, "_download_version"):
            self._download_version = self.download.split("/")[-2]
        return self._download_version


if __name__ == "__main__":
    manifest = Manifest("module.json")
    if manifest.download_version == manifest.version:
        print(f"Download version matches manifest version: {manifest.version}")
    else:
        exit(f"Download version does not match manifest version: {manifest.download_version} != {manifest.version}")
