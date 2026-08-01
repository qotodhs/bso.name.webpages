#!/usr/bin/env python3
"""Convert teacher-edition HVAC exam PDFs into the website question bank.

The source PDFs are two-column CBT sheets. Correct choices use filled circled
digits (❶-❹). Most questions can be represented as text; questions whose
meaning depends on a formula, table, drawing, or circuit also receive cropped
source images so no visual information is lost.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber


QUESTION_RE = re.compile(r"^(\d{1,3})\.\s*(.*)$")
SUBJECT_RE = re.compile(r"^(\d+)과목\s*:\s*(.+)$")
CHOICE_RE = re.compile(r"[①②③④❶❷❸❹]")
TRAILER_RE = re.compile(
    r"(?:전자문제집 CBT 홈페이지|기출문제 및 해설집 다운로드|전자문제집 CBT 앱|"
    r"전자문제집 CBT란\?|오답 및 오탈자가 수정된 최신 자료)"
)
ANSWER_ROW_RE = re.compile(r"([①②③④](?:\s+[①②③④]){9})")
FILLED = {"❶": 0, "❷": 1, "❸": 2, "❹": 3}
CHOICE_INDEX = {
    "①": 0,
    "②": 1,
    "③": 2,
    "④": 3,
    **FILLED,
}
VISUAL_HINTS = (
    "그림",
    "아래 표",
    "다음 표",
    "도표",
    "선도",
    "회로도",
    "회로에서",
    "배선도",
    "계통도",
    "냉동사이클",
    "P-h",
    "p-h",
    "몰리에르",
)


@dataclass(frozen=True)
class Line:
    order: int
    page: int
    column: int
    top: float
    bottom: float
    text: str


@dataclass(frozen=True)
class Segment:
    order: int
    page: int
    column: int
    x0: float
    x1: float
    top: float
    bottom: float


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\u200b", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\s*\n\s*", " ", value)
    return value.strip()


def group_lines(words: list[dict], *, y_tolerance: float = 3.0) -> list[tuple[float, float, str]]:
    rows: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not rows or abs(word["top"] - rows[-1][0]["top"]) > y_tolerance:
            rows.append([word])
        else:
            rows[-1].append(word)

    result = []
    for row in rows:
        ordered = sorted(row, key=lambda item: item["x0"])
        text = " ".join(item["text"] for item in ordered).strip()
        if text:
            result.append((min(item["top"] for item in ordered), max(item["bottom"] for item in ordered), text))
    return result


def extract_layout(pdf: pdfplumber.PDF) -> tuple[list[Line], list[Segment]]:
    lines: list[Line] = []
    segments: list[Segment] = []
    line_order = 0
    segment_order = 0

    for page_index, page in enumerate(pdf.pages):
        page_top = 54.0
        page_bottom = page.height - 34.0
        gutter = 4.0
        columns = (
            (20.0, page.width / 2 - gutter),
            (page.width / 2 + gutter, page.width - 20.0),
        )
        for column_index, (x0, x1) in enumerate(columns):
            segment = Segment(segment_order, page_index, column_index, x0, x1, page_top, page_bottom)
            segments.append(segment)
            crop = page.crop((x0, page_top, x1, page_bottom))
            words = crop.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False)
            for top, bottom, text in group_lines(words):
                lines.append(Line(line_order, page_index, column_index, top, bottom, text))
                line_order += 1
            segment_order += 1
    return lines, segments


def extract_answer_key(pdf: pdfplumber.PDF) -> dict[int, int]:
    """Read the ten-column answer grid printed on the final exam page."""
    text = "\n".join((page.extract_text() or "") for page in pdf.pages[-2:])
    answer_key: dict[int, int] = {}
    for start in range(1, 101, 10):
        numbers = list(range(start, start + 10))
        header = " ".join(str(number) for number in numbers)
        header_at = text.rfind(header)
        if header_at < 0:
            continue
        tail = text[header_at + len(header) : header_at + len(header) + 240]
        answer_match = ANSWER_ROW_RE.search(tail)
        if not answer_match:
            continue
        marks = answer_match.group(1).split()
        answer_key.update({number: CHOICE_INDEX[mark] for number, mark in zip(numbers, marks)})
    return answer_key


def classify_subject(label: str) -> str:
    compact = label.replace(" ", "")
    if any(term in compact for term in ("열역학", "에너지관리", "공기조화")):
        return "energy"
    if any(term in compact for term in ("냉동공학", "냉동설계", "공조냉동설계")):
        return "design"
    if any(term in compact for term in ("전기제어", "안전관리", "시운전")):
        return "safety"
    if any(term in compact for term in ("배관", "유지보수", "공사관리")):
        return "maintenance"
    return "maintenance"


def parse_choices(raw: str) -> tuple[str, list[str], int | None]:
    raw = TRAILER_RE.split(raw, maxsplit=1)[0].rstrip()
    matches = list(CHOICE_RE.finditer(raw))
    if not matches:
        return clean_text(raw), [], None

    # Each exam question has exactly four choices. Diagrams in the stem can
    # contain circled labels too, so the actual choices are the final four
    # markers after the printed answer-table trailer has been removed.
    matches = matches[-4:]

    question = clean_text(raw[: matches[0].start()])
    choices = [""] * 4
    answer = None
    for index, match in enumerate(matches):
        marker = match.group(0)
        choice_index = CHOICE_INDEX[marker]
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        text = clean_text(raw[match.end() : end])
        if choices[choice_index]:
            choices[choice_index] = clean_text(f"{choices[choice_index]} {text}")
        else:
            choices[choice_index] = text
        if marker in FILLED:
            answer = FILLED[marker] if answer is None else answer
    return question, choices, answer


def collect_questions(lines: list[Line]) -> list[dict]:
    starts: list[tuple[int, int, str, str]] = []
    current_subject = "과목 미상"
    expected = 1

    for line in lines:
        subject_match = SUBJECT_RE.match(line.text)
        if subject_match:
            current_subject = clean_text(subject_match.group(2))
            continue
        question_match = QUESTION_RE.match(line.text)
        if question_match and int(question_match.group(1)) == expected:
            starts.append((line.order, expected, current_subject, question_match.group(2)))
            expected += 1

    records: list[dict] = []
    for index, (start_order, number, subject_label, first_text) in enumerate(starts):
        end_order = starts[index + 1][0] if index + 1 < len(starts) else len(lines)
        body_lines = [first_text]
        body_lines.extend(
            line.text
            for line in lines
            if start_order < line.order < end_order and not SUBJECT_RE.match(line.text)
        )
        raw = "\n".join(body_lines)
        question, choices, answer = parse_choices(raw)
        start_line = next(line for line in lines if line.order == start_order)
        end_line = next((line for line in lines if line.order == end_order), None)
        records.append(
            {
                "number": number,
                "subject": classify_subject(subject_label),
                "subject_label": subject_label,
                "question": question,
                "choices": choices,
                "answer": answer,
                "raw": raw,
                "start": start_line,
                "end": end_line,
            }
        )
    return records


def needs_images(record: dict) -> bool:
    choices = record["choices"]
    if len(choices) != 4 or any(len(choice.strip()) < 2 for choice in choices):
        return True
    combined = f'{record["question"]} {" ".join(choices)}'
    compact = re.sub(r"\s+", "", combined)
    if any(re.sub(r"\s+", "", hint) in compact for hint in VISUAL_HINTS):
        return True
    return bool(re.search(r"(?:\b\d\b\s*){3,}", combined))


def fragment_boxes(record: dict, segments: list[Segment]) -> list[tuple[int, tuple[float, float, float, float]]]:
    by_key = {(segment.page, segment.column): segment for segment in segments}
    start: Line = record["start"]
    end: Line | None = record["end"]
    start_segment = by_key[(start.page, start.column)]
    end_segment = by_key[(end.page, end.column)] if end else segments[-1]
    boxes = []

    for segment in segments[start_segment.order : end_segment.order + 1]:
        top = start.top - 3 if segment.order == start_segment.order else segment.top
        if end and segment.order == end_segment.order:
            bottom = end.top - 3
        else:
            bottom = segment.bottom
        if bottom - top > 8:
            boxes.append((segment.page, (segment.x0, max(segment.top, top), segment.x1, min(segment.bottom, bottom))))
    return boxes


def render_images(
    pdf: pdfplumber.PDF,
    record: dict,
    segments: list[Segment],
    image_dir: Path,
    public_prefix: str,
) -> list[str]:
    image_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for fragment_index, (page_index, bbox) in enumerate(fragment_boxes(record, segments), start=1):
        page = pdf.pages[page_index]
        image = page.crop(bbox).to_image(resolution=150, antialias=True).original.convert("RGB")
        filename = f'q{record["number"]:03d}-{fragment_index}.webp'
        output = image_dir / filename
        image.save(output, "WEBP", quality=88, method=6)
        paths.append(f"{public_prefix}/{filename}")
    return paths


def date_label(date: str) -> str:
    return f"{date[:4]}년 {date[4:6]}월 {date[6:]}일"


def javascript_for_exam(date: str, questions: list[dict]) -> str:
    metadata = {
        "id": date,
        "label": date_label(date),
        "source": f"공조냉동기계기사 {date_label(date)} 필기 기출문제",
        "total": len(questions),
    }
    rows = []
    for record in questions:
        choices = record["choices"]
        if len(choices) != 4 or any(len(choice.strip()) < 2 for choice in choices):
            choices = [f"원문 이미지의 보기 {index}" for index in range(1, 5)]
        rows.append(
            [
                f"HVAC-{date}-{record['number']:03d}",
                record["subject"],
                record["subject_label"],
                record["question"],
                choices,
                record["answer"],
                record.get("images", []),
            ]
        )
    metadata_json = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
    rows_json = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    return f"window.addHVACExamQuestions({metadata_json},{rows_json});\n"


def javascript_index(dates: list[str]) -> str:
    dates_json = json.dumps([f"{date}.js" for date in dates], ensure_ascii=False, separators=(",", ":"))
    return (
        "const hvacHistoryBase = new URL(\"./\", document.currentScript.src);\n"
        f"{dates_json}.forEach((filename) => {{\n"
        "  const src = new URL(filename, hvacHistoryBase).href;\n"
        "  document.write(`<script src=\"${src}\"><\\/script>`);\n"
        "});\n"
    )


def iter_exam_pdfs(source_dir: Path) -> Iterable[Path]:
    pattern = re.compile(r"공조냉동기계기사(\d{8})\(교사용\)\.pdf$")
    return sorted((path for path in source_dir.glob("*.pdf") if pattern.match(path.name)), key=lambda path: path.name)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("site_root", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    exam_dir = args.site_root / "study" / "HVAC" / "engicert" / "question-data" / "history"
    asset_root = args.site_root / "study" / "HVAC" / "engicert" / "question-images" / "history"
    pdfs = list(iter_exam_pdfs(args.source_dir))
    if args.limit:
        pdfs = pdfs[: args.limit]

    total_questions = 0
    total_visual = 0
    failures: list[str] = []
    summaries = []
    successful_dates: list[str] = []

    for pdf_path in pdfs:
        date_match = re.search(r"(\d{8})", pdf_path.name)
        assert date_match
        date = date_match.group(1)
        with pdfplumber.open(pdf_path) as pdf:
            lines, segments = extract_layout(pdf)
            questions = collect_questions(lines)
            answer_key = extract_answer_key(pdf)
            errors = []
            for record in questions:
                printed_answer = answer_key.get(record["number"])
                if printed_answer is not None:
                    record["answer"] = printed_answer
                if record["answer"] is None:
                    errors.append(f'{record["number"]}:answer')
                if len(record["choices"]) != 4:
                    errors.append(f'{record["number"]}:choices')
                if not record["question"]:
                    errors.append(f'{record["number"]}:question')

            visual_count = sum(needs_images(record) for record in questions)
            subject_counts = Counter(record["subject_label"] for record in questions)
            summaries.append(
                {
                    "date": date,
                    "questions": len(questions),
                    "visual": visual_count,
                    "subjects": dict(subject_counts),
                    "answer_key": len(answer_key),
                    "errors": errors,
                }
            )
            total_questions += len(questions)
            total_visual += visual_count
            if errors:
                failures.append(f"{date}: {', '.join(errors)}")

            if not args.dry_run and not errors:
                for record in questions:
                    if needs_images(record):
                        record["images"] = render_images(
                            pdf,
                            record,
                            segments,
                            asset_root / date,
                            f"./question-images/history/{date}",
                        )
                    else:
                        record["images"] = []
                exam_dir.mkdir(parents=True, exist_ok=True)
                (exam_dir / f"{date}.js").write_text(javascript_for_exam(date, questions), encoding="utf-8")
                successful_dates.append(date)

    if not args.dry_run and not failures:
        exam_dir.mkdir(parents=True, exist_ok=True)
        (exam_dir / "index.js").write_text(javascript_index(successful_dates), encoding="utf-8")

    print(json.dumps({"files": len(pdfs), "questions": total_questions, "visual": total_visual, "failures": failures, "exams": summaries}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
