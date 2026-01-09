import argparse
import csv
import os
import re
import sys
from typing import Iterable, Dict, List, Optional, Callable
import threading


def escape_vcard_value(value: str) -> str:
    if value is None:
        return ""
    v = value.replace('\\', '\\\\')
    v = v.replace('\r', ' ').replace('\n', ' ')
    v = v.replace(',', r'\,').replace(';', r'\;')
    return v.strip()


def sanitize_phone(phone: str) -> str:
    if phone is None:
        return ""
    # keep digits and leading + only
    phone = phone.strip()
    sanitized = re.sub(r"[^0-9+]+", "", phone)
    return sanitized


def format_n_field(full_name: str) -> str:
    # Try to split into family;given;additional;prefix;suffix
    if not full_name:
        return ";;;;;"
    parts = full_name.split()
    if len(parts) == 1:
        given = parts[0]
        family = ""
        additional = ""
    else:
        given = parts[0]
        family = parts[-1]
        additional = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    return f"{family};{given};{additional};;"


def format_vcard(fn: str, phones: List[Dict[str, str]]) -> str:
    # phones: list of dicts with keys 'number' and 'label'
    fn_escaped = escape_vcard_value(fn)
    n_field = escape_vcard_value(format_n_field(fn))
    lines = ["BEGIN:VCARD", "VERSION:3.0", f"FN:{fn_escaped}", f"N:{n_field}"]
    for p in phones:
        num = sanitize_phone(p.get("number", ""))
        if not num:
            continue
        label = (p.get("label") or "CELL").upper()
        # allow comma-separated types
        lines.append(f"TEL;TYPE={label}:{num}")
    lines.append("END:VCARD\n")
    return "\n".join(lines)


def read_contacts(path: str, fields: List[str]) -> Iterable[Dict[str, str]]:
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield row
    except FileNotFoundError:
        print(f"Input file not found: {path}", file=sys.stderr)
        sys.exit(2)


def get_csv_fieldnames(path: str) -> Optional[List[str]]:
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return reader.fieldnames or []
    except FileNotFoundError:
        return None


def choose_field(headers: List[str], desired: Optional[str], field_type: str) -> str:
    # If desired is provided and valid, use it
    if desired:
        if desired in headers:
            return desired
        print(f"Requested {field_type} field '{desired}' not found in CSV headers.")

    # If interactive, prompt user
    if sys.stdin.isatty():
        print(f"Available columns for {field_type}:")
        for i, h in enumerate(headers, start=1):
            print(f"  {i}. {h}")
        while True:
            resp = input(f"Choose column number or name for {field_type}: ").strip()
            if not resp:
                continue
            if resp.isdigit():
                idx = int(resp) - 1
                if 0 <= idx < len(headers):
                    return headers[idx]
            elif resp in headers:
                return resp
            print("Invalid selection — try again.")

    # Non-interactive fallback: heuristics
    prefs = {
        "name": ["name", "full_name", "fullname", "fn", "display_name", "given_name"],
        "phone": ["phone", "phone_number", "phone1", "mobile", "mobile_phone", "cell", "cellphone"],
    }
    for p in prefs.get(field_type, []):
        for h in headers:
            if h.lower() == p:
                return h

    # Final fallback: return first header
    return headers[0]


def write_vcards(contacts: Iterable[Dict[str, str]], out_path: str, name_field: str, phone_field: str, postfix: str) -> None:
    try:
        with open(out_path, "w", encoding="utf-8", newline="") as vcf:
            for c in contacts:
                name = (c.get(name_field) or "").strip()
                phone = (c.get(phone_field) or "").strip()
                if not phone:
                    continue
                full_name = (name + postfix).strip() if postfix else name
                vcf.write(format_vcard(full_name, phone))
    except OSError as e:
        print(f"Failed to write output file: {e}", file=sys.stderr)
        sys.exit(3)
    except OSError as e:
        print(f"Failed to write output file: {e}", file=sys.stderr)
        sys.exit(3)


def count_csv_rows(path: str) -> int:
    # count non-header rows
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        # consume header
        try:
            next(reader)
        except StopIteration:
            return 0
        return sum(1 for _ in reader)


def write_vcards_stream(path: str, out_path: str, name_field: str, phone_fields: List[str], phone_labels: Optional[List[str]] = None, prefix: str = "", postfix: str = "", progress: Optional[Callable[[int, int], None]] = None, stop_event: Optional[threading.Event] = None) -> int:
    """
    Stream contacts from CSV at `path` and write vCards to `out_path`.
    `phone_fields` is a list of CSV column names to pull phone numbers from.
    `phone_labels` is an optional list of labels matching `phone_fields` (defaults to CELL).
    `progress` is an optional callback(progressed, total).
    Returns number of vCards written.
    """
    total = count_csv_rows(path)
    written = 0
    phone_labels = phone_labels or ["CELL"] * len(phone_fields)
    with open(path, newline="", encoding="utf-8") as f_in, open(out_path, "w", encoding="utf-8", newline="") as vcf:
        reader = csv.DictReader(f_in)
        for i, row in enumerate(reader, start=1):
            if stop_event and stop_event.is_set():
                # Interrupted by GUI cancel
                break
            name = (row.get(name_field) or "").strip()
            phones = []
            for idx, pf in enumerate(phone_fields):
                num = (row.get(pf) or "").strip()
                label = phone_labels[idx] if idx < len(phone_labels) else "CELL"
                if num:
                    phones.append({"number": num, "label": label})
            if not phones:
                # skip rows without phones
                if progress:
                    progress(i, total)
                continue
            parts = []
            if prefix:
                parts.append(prefix.strip())
            if name:
                parts.append(name)
            if postfix:
                parts.append(postfix.strip())
            full_name = " ".join(parts).strip()
            vcf.write(format_vcard(full_name, phones))
            written += 1
            if progress:
                progress(i, total)
    return written


def parse_args():
    p = argparse.ArgumentParser(description="Create a .vcf file from a CSV of contacts")
    p.add_argument("--input", "-i", default="contacts.csv", help="Input CSV file path")
    p.add_argument("--output", "-o", default=None, help="Output VCF file path (default: same dir as input, inputname.vcf)")
    p.add_argument("--postfix", "-p", default="", help="Optional postfix to append to each name")
    p.add_argument("--prefix", default="", help="Optional prefix to prepend to each name")
    p.add_argument("--name-field", default="name", help="CSV column name for contact name")
    p.add_argument("--phone-field", default="phone", help="CSV column name for phone number (deprecated). Use --phone-fields for multiple columns")
    p.add_argument("--phone-fields", default=None, help="Comma-separated CSV column names to use for phone numbers")
    p.add_argument("--phone-labels", default=None, help="Comma-separated labels matching --phone-fields (e.g. CELL,HOME)")
    return p.parse_args()


def main():
    args = parse_args()
    # Determine output path default: same directory as input, basename.vcf
    input_path = args.input or "contacts.csv"
    if args.output:
        output_path = args.output
    else:
        base = os.path.splitext(os.path.basename(input_path))[0]
        dirn = os.path.dirname(input_path) or "."
        output_path = os.path.join(dirn, base + ".vcf")

    headers = get_csv_fieldnames(input_path)
    if headers is None:
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(2)

    # Determine name field and phone fields (allow interactive selection)
    name_field = args.name_field if args.name_field in headers else None
    name_field = choose_field(headers, name_field, "name")

    if args.phone_fields:
        phone_fields = [p.strip() for p in args.phone_fields.split(',') if p.strip()]
    else:
        # fallback to single phone-field arg
        phone_fields = [args.phone_field] if args.phone_field else []

    # validate phone_fields and allow interactive selection for missing ones
    valid_phone_fields = [pf for pf in phone_fields if pf in headers]
    if not valid_phone_fields:
        # let user choose one or more
        # choose_field returns single field; for CLI interactive we ask repeatedly
        # For simplicity, pick one default then allow additional heuristic picks
        chosen = choose_field(headers, None, "phone")
        valid_phone_fields = [chosen]

    phone_labels = None
    if args.phone_labels:
        phone_labels = [s.strip() for s in args.phone_labels.split(',') if s.strip()]

    written = write_vcards_stream(input_path, output_path, name_field, valid_phone_fields, phone_labels, args.prefix, args.postfix, progress=None)
    print(f"Wrote {written} vCards to {output_path}")


if __name__ == "__main__":
    main()
