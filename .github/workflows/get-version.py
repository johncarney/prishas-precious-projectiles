import json

with open("module.json") as f:
  data = json.load(f)
  print(data["version"])
