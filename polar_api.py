import sys, json, subprocess

result = subprocess.run(
    ["curl", "-sL", "https://api.polar.sh/openapi.json"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
d = json.loads(result.stdout)

for path in sorted(d["paths"].keys()):
    methods = [m.upper() for m in d["paths"][path].keys() if m != "parameters"]
    print(f"{' '.join(methods):20s} {path}")
