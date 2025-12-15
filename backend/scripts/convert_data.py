from pathlib import Path
import argparse
from backend.services.data_loader import export_excel_to_json


def main():
    parser = argparse.ArgumentParser(description="Konversi Excel data capstone menjadi JSON")
    parser.add_argument("--out", type=str, default="backend/data", help="Folder output JSON")
    args = parser.parse_args()

    out_dir = Path(args.out)

    tasks = [
        ("LP and Course Mapping.xlsx", out_dir / "lp_course_mapping.json"),
        ("Resource Data Learning Buddy.xlsx", out_dir / "resource_data.json"),
    ]

    for filename, out_path in tasks:
        print(f"Mengonversi: {filename} -> {out_path}")
        export_excel_to_json(filename, out_path)

    print("Selesai.")


if __name__ == "__main__":
    main()

