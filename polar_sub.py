import sys, json, subprocess

result = subprocess.run(
    ["curl", "-sL", "https://api.polar.sh/openapi.json"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
d = json.loads(result.stdout)

for name in ["SubscriptionCancel", "SubscriptionUpdateBase", "SubscriptionRevoke"]:
    print(f"\n=== {name} ===")
    print(json.dumps(d["components"]["schemas"][name], indent=2))
