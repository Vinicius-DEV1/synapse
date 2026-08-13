import re

with open("src-tauri/src/db.rs", "r") as f:
    content = f.read()

# Match standard execute calls: let _ = conn.execute("ALTER TABLE table ADD COLUMN column...", []);
pattern = re.compile(r'^\s*let _ = conn\.execute\(\s*"ALTER TABLE (\w+) ADD COLUMN (\w+)[^"]*",\s*\[\],\s*\)?;\n?', re.MULTILINE)

seen = set()
def replacer(match):
    table = match.group(1)
    col = match.group(2)
    key = f"{table}:{col}"
    if key in seen:
        return "" # Remove duplicate
    seen.add(key)
    return match.group(0)

new_content = pattern.sub(replacer, content)

# Now match multiline ones:
multiline_pattern = re.compile(r'^\s*let _ = conn\.execute\(\n\s*"ALTER TABLE (\w+) ADD COLUMN (\w+)[^"]*",\n\s*\[\],\n\s*\)?;\n?', re.MULTILINE)
new_content = multiline_pattern.sub(replacer, new_content)

# Remove duplicate CREATE TABLEs
create_pattern = re.compile(r'^\s*let _ = conn\.execute\("CREATE TABLE IF NOT EXISTS (\w+)[^"]*",\s*\[\]\);\n?', re.MULTILINE)
create_seen = set()
def create_replacer(match):
    table = match.group(1)
    # Check if table was already created in the big block at the top
    # Actually, we can just deduplicate execute("CREATE TABLE") statements
    if table in create_seen:
        return ""
    create_seen.add(table)
    return match.group(0)

# But wait, the big block uses execute_batch, so they aren't matched by this regex!
# So any let _ = conn.execute("CREATE TABLE ...") that is ALREADY in the execute_batch string can be removed.
batch_match = re.search(r'conn\.execute_batch\((.*?)\)', new_content, re.DOTALL)
if batch_match:
    batch_str = batch_match.group(1)
    def create_replacer2(match):
        table = match.group(1)
        if f"CREATE TABLE IF NOT EXISTS {table}" in batch_str:
            return "" # Already created in batch
        # Wait, ai_prompts is NOT in batch, so it will be kept!
        return match.group(0)
    new_content = create_pattern.sub(create_replacer2, new_content)

# Write back
with open("src-tauri/src/db.rs", "w") as f:
    f.write(new_content)
