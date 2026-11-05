"""Step 1: turn the researcher's earlier site (supplied source SRC-SUP-01)
into *candidate* claims. Nothing here is treated as verified.

Input : data-staging/extracted/supplied/old-site-index.txt
Output: data-staging/normalized/seed-claims.json
"""
import re

from common import STAGING, now_iso, write_json

SRC = "SRC-SUP-01"
text = (STAGING / "extracted/supplied/old-site-index.txt").read_text(encoding="utf-8")
lines = text.splitlines()

# --- publications block: "NN" / title / meta line / badge line --------------
pubs = []
start = lines.index("Selected papers.")
end = next(i for i, l in enumerate(lines) if l.startswith("View on Google Scholar"))
block = lines[start:end]
i = 0
while i < len(block):
    if re.fullmatch(r"\d{2}", block[i]) and i + 3 < len(block):
        title, meta, badge = block[i + 1], block[i + 2], block[i + 3]
        parts = [p.strip() for p in meta.split("·")]
        rec = {
            "seed_id": f"seed-{block[i]}",
            "listed_order": int(block[i]),
            "title_as_listed": title,
            "authors_as_listed": parts[0],
            "venue_as_listed": parts[1] if len(parts) > 2 else None,
            "year_as_listed": next((int(p) for p in parts if re.fullmatch(r"(19|20)\d{2}", p)), None),
            "volume_issue_pages_as_listed": " · ".join(parts[3:]) if len(parts) > 3 else None,
            "badge_as_listed": badge,   # e.g. "Q1 · 2025" — self-reported, unsourced
            "source_id": SRC,
            "verification_status": "candidate",
        }
        pubs.append(rec)
        i += 4
    else:
        i += 1

claims = {
    "source_id": SRC,
    "extracted_at": now_iso(),
    "note": "Self-published claims from the researcher's earlier site. Candidate status until verified or confirmed by the researcher.",
    "identity": {
        "display_name": "Ibrahim Mohamed Taha",
        "headline": "Statistician & Academic Researcher",
        "roles_claimed": [
            "Teaching Assistant, Sadat Academy for Management Sciences (Maadi, Cairo)",
            "PhD candidate, Applied Statistics and Econometrics, Faculty of Graduate Studies for Statistical Research (FGSSR), Cairo University",
            "Statistical consultant",
            "Founder/admin, Statistical Analysis – Egypt community",
        ],
        "location_claimed": "Cairo, Egypt",
        "profile_links": {
            "google_scholar": "https://scholar.google.com/citations?user=VgoxbyYAAAAJ&hl=en",
            "researchgate": "https://www.researchgate.net/profile/Ibrahim_Taha11",
            "linkedin": "https://www.linkedin.com/in/ibrahimaboalazm/",
            "telegram": "https://t.me/StatisticalAnalysisEgypt",
            "facebook_page": "https://www.facebook.com/share/1B3DbXjPh7/",
            "facebook_group": "https://www.facebook.com/share/g/1biRB3jfwp/",
        },
        "private_contact_present": "email and phone present in source; kept only in the raw file, not copied here",
    },
    "research_areas_claimed": [
        "Penalized regression (Ridge, Liu-type, Elastic Net) for count regression",
        "Beta regression",
        "Generalized linear models / multicollinearity",
        "Bayesian estimation",
        "Structural equation modeling",
        "Applied econometrics",
    ],
    "software_claimed": ["R", "SPSS", "Stata", "EViews", "AMOS", "SmartPLS", "MATLAB", "WinBUGS", "JASP", "lavaan"],
    "self_reported_figures": {
        "consulting_projects": "450+",
        "community_members_total": "550K+",
        "facebook_page_followers": "390,000+",
        "facebook_group_members": "118,000+",
        "telegram_subscribers": "45,000+",
        "published_papers": "9",
    },
    "publications": pubs,
}
write_json(STAGING / "normalized/seed-claims.json", claims)
print(f"{len(pubs)} publication claims seeded")
for p in pubs:
    print(f"  {p['seed_id']} {p['year_as_listed']} | {p['title_as_listed'][:70]} | {p['venue_as_listed']}")
