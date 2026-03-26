import json
import pandas as pd
from pathlib import Path

RC_DESCRIPTIONS = {
    "00": "Success",
    "51": "Insufficient Funds",
    "55": "Invalid PIN",
    "57": "Transaction Not Permitted",
    "62": "Restricted Card",
    "76": "Invalid/Expired Card",
    "05": "Do Not Honor",
    "13": "Invalid Amount",
    "14": "Invalid Card Number",
    "41": "Lost Card",
    "43": "Stolen Card",
    "54": "Expired Card",
    "91": "Issuer Not Available",
    "96": "System Malfunction",
}


def load_bin_lookup(path: Path) -> pd.DataFrame:
    """Load bin_list.json and return as DataFrame with columns [bin, bank_name]."""
    with open(path, "r") as f:
        data = json.load(f)
    rows = [{"bin": k, "bank_name": v["name"]} for k, v in data.items() if "name" in v]
    return pd.DataFrame(rows, columns=["bin", "bank_name"])


def get_rc_description(rc: str) -> str:
    """Map RC code to human-readable description."""
    return RC_DESCRIPTIONS.get(rc, f"Code {rc}")
