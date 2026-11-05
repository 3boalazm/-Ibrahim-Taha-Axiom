"""Step 4: public software/data repositories on GitHub.

The account `IbrahimTaha2018` was discovered from the Zenodo dataset's
`IsSupplementTo` relation (DataCite), i.e. linked by the researcher's own
deposit. Unauthenticated GitHub REST API only.
"""
from common import RAW, STAGING, fetch_json, write_json

user = "IbrahimTaha2018"
_, prof, _ = fetch_json(f"https://api.github.com/users/{user}", RAW / f"profiles/github/{user}.json",
                        source_id="SRC-GITHUB", method="GitHub REST /users/{user}")
_, repos, _ = fetch_json(f"https://api.github.com/users/{user}/repos?per_page=100&sort=updated",
                         RAW / f"profiles/github/{user}-repos.json", source_id="SRC-GITHUB",
                         method="GitHub REST /users/{user}/repos")
out = []
for r in repos or []:
    _, lic, _ = (None, None, None)
    out.append({
        "name": r["name"], "full_name": r["full_name"], "url": r["html_url"], "description": r.get("description"),
        "fork": r["fork"], "language": r.get("language"), "license": (r.get("license") or {}).get("spdx_id"),
        "created_at": r["created_at"], "pushed_at": r["pushed_at"], "stars": r["stargazers_count"],
        "topics": r.get("topics", []), "archived": r.get("archived"),
    })
write_json(STAGING / "normalized/github-repos.json", {"profile": {k: (prof or {}).get(k) for k in
           ["login", "name", "company", "blog", "location", "bio", "public_repos", "created_at", "html_url"]}, "repos": out})
print((prof or {}).get("login"), (prof or {}).get("name"), "| public repos:", (prof or {}).get("public_repos"))
for r in out:
    print(f"  {r['name']:<55} {r['language'] or '-':<8} lic={r['license']} fork={r['fork']} | {(r['description'] or '')[:70]}")
