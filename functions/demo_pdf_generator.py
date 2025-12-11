#!/usr/bin/env python3
"""
Demo script for PDF Report Generator Service.

Demonstrates PDF generation with a sample kitchen remodel estimate,
showing all sections and generating both full and client-ready versions.

Usage:
    cd functions && python3 demo_pdf_generator.py
    cd functions && python3 demo_pdf_generator.py --client-ready
    cd functions && python3 demo_pdf_generator.py --sections executive_summary,cost_breakdown
    cd functions && python3 demo_pdf_generator.py --open

Output:
    - sample_estimate.pdf - Full estimate report with all sections
    - sample_estimate_client.pdf - Client-ready version (with --client-ready)
"""

import argparse
import os
import sys
import time
import subprocess
import platform
from pathlib import Path
from typing import List, Optional, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from services.pdf_generator import (
    generate_pdf_local,
    get_available_sections,
    validate_sections,
    PDFGenerationResult,
)
from services.monte_carlo import run_simulation, LineItemInput


def format_currency(value: float) -> str:
    """Format a number as currency."""
    return f"${value:,.0f}"


def format_size(bytes_val: int) -> str:
    """Format bytes as human-readable size."""
    if bytes_val >= 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.1f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.0f} KB"
    return f"{bytes_val} bytes"


def create_kitchen_remodel_estimate() -> Dict[str, Any]:
    """
    Create a comprehensive sample kitchen remodel estimate.

    Returns a dictionary with all data needed for PDF generation,
    including Monte Carlo simulation results.
    """
    # Define line items for Monte Carlo simulation
    line_items = [
        LineItemInput("1", "Cabinet installation", 20.0, 175.0, 225.0, 350.0),
        LineItemInput("2", "Countertop materials (granite)", 40.0, 65.0, 85.0, 125.0),
        LineItemInput("3", "Interior paint", 500.0, 0.95, 1.25, 1.75),
        LineItemInput("4", "Flooring (hardwood)", 200.0, 9.0, 12.0, 18.0),
        LineItemInput("5", "Electrical rough-in", 1.0, 2800.0, 3500.0, 4500.0),
        LineItemInput("6", "Plumbing fixtures", 1.0, 950.0, 1250.0, 1800.0),
        LineItemInput("7", "Plumbing rough-in", 1.0, 2200.0, 2800.0, 3800.0),
        LineItemInput("8", "Lighting fixtures (LED)", 12.0, 125.0, 175.0, 275.0),
        LineItemInput("9", "Appliance package", 1.0, 2500.0, 3500.0, 5500.0),
        LineItemInput("10", "Backsplash tile", 30.0, 6.50, 8.50, 12.00),
        LineItemInput("11", "Sink and faucet", 1.0, 400.0, 600.0, 900.0),
        LineItemInput("12", "Range hood", 1.0, 300.0, 500.0, 800.0),
        LineItemInput("13", "Garbage disposal", 1.0, 150.0, 250.0, 400.0),
        LineItemInput("14", "Drywall repair", 100.0, 0.75, 0.85, 1.10),
        LineItemInput("15", "Trim and molding", 60.0, 2.50, 3.50, 5.00),
        LineItemInput("16", "Permits and fees", 1.0, 800.0, 1200.0, 1800.0),
        LineItemInput("17", "Demolition", 1.0, 1500.0, 2000.0, 3000.0),
        LineItemInput("18", "Waste removal", 1.0, 400.0, 600.0, 900.0),
        LineItemInput("19", "Hardware (handles, knobs)", 30.0, 8.0, 12.0, 20.0),
        LineItemInput("20", "Contingency allowance", 1.0, 1000.0, 1500.0, 2500.0),
    ]

    # Run Monte Carlo simulation
    mc_result = run_simulation(line_items, iterations=1000)

    # Build complete estimate data
    return {
        "estimate_id": "demo_kitchen_2024",
        "projectName": "Kitchen Remodel - 123 Main St",
        "address": "123 Main Street, Denver, CO 80202",
        "projectType": "Residential Renovation",
        "scope": "Full kitchen remodel including custom cabinetry, granite countertops, new appliances, flooring, electrical and plumbing upgrades, and complete refinishing.",
        "squareFootage": 200,

        # Cost summary from Monte Carlo
        "totalCost": mc_result.p50,
        "p50": mc_result.p50,
        "p80": mc_result.p80,
        "p90": mc_result.p90,
        "contingencyPct": mc_result.recommended_contingency,
        "timelineWeeks": 6,
        "monteCarloIterations": mc_result.iterations,

        # Internal notes (hidden in client-ready mode)
        "internalNotes": "Client has flexible budget. Prefers modern farmhouse style. May want to upgrade appliances to premium tier. Consider suggesting quartz as alternative to granite.",

        # Cost drivers
        "costDrivers": [
            {"name": "Cabinetry", "cost": 4500, "percentage": 10},
            {"name": "Appliances", "cost": 3500, "percentage": 8},
            {"name": "Countertops", "cost": 3400, "percentage": 8},
            {"name": "Labor", "cost": mc_result.p50 * 0.35, "percentage": 35},
        ],

        # Labor analysis
        "laborAnalysis": {
            "total_hours": 240,
            "base_total": 11536,
            "burden_total": 4038,
            "total": 15574,
            "labor_pct": 35,
            "estimated_days": 30,
            "trades": [
                {"name": "Carpenter", "hours": 80.0, "rate": 52.00, "base_cost": 4160, "burden": 1456, "total": 5616},
                {"name": "Electrician", "hours": 32.0, "rate": 65.00, "base_cost": 2080, "burden": 728, "total": 2808},
                {"name": "Plumber", "hours": 24.0, "rate": 62.00, "base_cost": 1488, "burden": 521, "total": 2009},
                {"name": "Painter", "hours": 40.0, "rate": 40.00, "base_cost": 1600, "burden": 560, "total": 2160},
                {"name": "Tile Setter", "hours": 16.0, "rate": 48.00, "base_cost": 768, "burden": 269, "total": 1037},
                {"name": "General Labor", "hours": 48.0, "rate": 30.00, "base_cost": 1440, "burden": 504, "total": 1944},
            ],
            "location_factors": {
                "is_union": False,
                "union_premium": 1.0,
            },
        },

        # Schedule
        "schedule": {
            "total_weeks": 6,
            "start_date": "Upon contract signing",
            "end_date": "6 weeks from start",
            "tasks": [
                {"number": 1, "name": "Pre-Construction", "duration": "1 week", "start": "Week 1", "end": "Week 1", "is_milestone": True, "dependencies": []},
                {"number": "1.1", "name": "Permits & Approvals", "duration": "3-5 days", "start": "Day 1", "end": "Day 5", "dependencies": ["Contract signed"]},
                {"number": "1.2", "name": "Material Ordering", "duration": "2-3 days", "start": "Day 3", "end": "Day 5", "dependencies": ["Permits filed"]},
                {"number": 2, "name": "Demolition", "duration": "2-3 days", "start": "Week 2", "end": "Week 2", "is_milestone": True, "dependencies": ["Pre-construction"]},
                {"number": 3, "name": "Rough Work", "duration": "1 week", "start": "Week 2", "end": "Week 3", "is_milestone": True, "dependencies": ["Demolition"]},
                {"number": "3.1", "name": "Electrical Rough-in", "duration": "2 days", "start": "Week 2", "end": "Week 2", "dependencies": ["Demo complete"]},
                {"number": "3.2", "name": "Plumbing Rough-in", "duration": "2 days", "start": "Week 2", "end": "Week 3", "dependencies": ["Demo complete"]},
                {"number": 4, "name": "Inspections", "duration": "1-2 days", "start": "Week 3", "end": "Week 3", "is_milestone": True, "dependencies": ["Rough work"]},
                {"number": 5, "name": "Finishes", "duration": "2 weeks", "start": "Week 3", "end": "Week 5", "is_milestone": True, "dependencies": ["Inspections passed"]},
                {"number": "5.1", "name": "Drywall & Painting", "duration": "4-5 days", "start": "Week 3", "end": "Week 4", "dependencies": ["Inspection passed"]},
                {"number": "5.2", "name": "Flooring", "duration": "2-3 days", "start": "Week 4", "end": "Week 4", "dependencies": ["Drywall complete"]},
                {"number": "5.3", "name": "Cabinets & Countertops", "duration": "3-4 days", "start": "Week 4", "end": "Week 5", "dependencies": ["Flooring complete"]},
                {"number": 6, "name": "Fixtures & Appliances", "duration": "2-3 days", "start": "Week 5", "end": "Week 5", "is_milestone": True, "dependencies": ["Finishes"]},
                {"number": 7, "name": "Final Inspection & Punch List", "duration": "2-3 days", "start": "Week 6", "end": "Week 6", "is_milestone": True, "dependencies": ["All work complete"]},
            ],
            "notes": [
                "Schedule assumes normal weather conditions",
                "Permit timeline may vary (typically 3-10 business days)",
                "Cabinet lead time: 2-3 weeks (order placed during pre-construction)",
                "Appliance delivery coordinated for Week 5",
            ],
        },

        # Cost breakdown by category
        "cost_breakdown": {
            "total_material": mc_result.p50 * 0.55,
            "total_labor": mc_result.p50 * 0.35,
            "permits": mc_result.p50 * 0.03,
            "overhead": mc_result.p50 * 0.07,
            "material_pct": 55,
            "labor_pct": 35,
            "permits_pct": 3,
            "overhead_pct": 7,
            "divisions": [
                {
                    "code": "06",
                    "name": "Wood, Plastics, and Composites",
                    "total": 4900,
                    "material_subtotal": 3600,
                    "labor_subtotal": 1300,
                    "items": [
                        {"description": "Hardwood Flooring", "quantity": 200, "unit": "sf", "unit_cost": 12.00, "material_cost": 2400, "labor_cost": 800},
                        {"description": "Trim and Molding", "quantity": 60, "unit": "lf", "unit_cost": 3.50, "material_cost": 210, "labor_cost": 200},
                    ],
                },
                {
                    "code": "09",
                    "name": "Finishes",
                    "total": 1300,
                    "material_subtotal": 880,
                    "labor_subtotal": 420,
                    "items": [
                        {"description": "Interior Paint, 2 coats", "quantity": 500, "unit": "sf", "unit_cost": 1.25, "material_cost": 625, "labor_cost": 300},
                        {"description": "Backsplash Tile", "quantity": 30, "unit": "sf", "unit_cost": 8.50, "material_cost": 255, "labor_cost": 120},
                    ],
                },
                {
                    "code": "12",
                    "name": "Furnishings",
                    "total": 7900,
                    "material_subtotal": 6400,
                    "labor_subtotal": 1500,
                    "items": [
                        {"description": "Kitchen Cabinets", "quantity": 20, "unit": "lf", "unit_cost": 225.00, "material_cost": 4500, "labor_cost": 1000},
                        {"description": "Granite Countertops", "quantity": 40, "unit": "sf", "unit_cost": 85.00, "material_cost": 3400, "labor_cost": 500},
                    ],
                },
            ],
        },

        # Risk analysis from Monte Carlo
        "risk_analysis": {
            "iterations": mc_result.iterations,
            "p50": mc_result.p50,
            "p80": mc_result.p80,
            "p90": mc_result.p90,
            "contingency_pct": mc_result.recommended_contingency,
            "contingency_amount": mc_result.p50 * mc_result.recommended_contingency / 100,
            "min": mc_result.min_value,
            "max": mc_result.max_value,
            "max_percentage": max(bin.percentage for bin in mc_result.histogram) if mc_result.histogram else 20,
            "histogram": [
                {
                    "range_low": bin.range_low,
                    "range_high": bin.range_high,
                    "count": bin.count,
                    "percentage": bin.percentage,
                }
                for bin in mc_result.histogram
            ],
            "top_risks": [
                {
                    "item": risk.item,
                    "impact": risk.impact,
                    "probability": risk.probability,
                    "sensitivity": risk.sensitivity,
                }
                for risk in mc_result.top_risks
            ],
        },

        # Bill of quantities
        "bill_of_quantities": {
            "items": [
                {"line_number": 1, "description": "Kitchen Cabinets, wood, standard grade", "quantity": 20.0, "unit": "lf", "unit_cost": 225.00, "total": 4500, "csi_division": "12"},
                {"line_number": 2, "description": "Countertops, granite, standard", "quantity": 40.0, "unit": "sf", "unit_cost": 85.00, "total": 3400, "csi_division": "12"},
                {"line_number": 3, "description": "Interior Paint, latex, 2 coats", "quantity": 500.0, "unit": "sf", "unit_cost": 1.25, "total": 625, "csi_division": "09"},
                {"line_number": 4, "description": "Hardwood Flooring", "quantity": 200.0, "unit": "sf", "unit_cost": 12.00, "total": 2400, "csi_division": "06"},
                {"line_number": 5, "description": "Electrical Rough-in", "quantity": 1.0, "unit": "ls", "unit_cost": 3500.00, "total": 3500, "csi_division": "26"},
                {"line_number": 6, "description": "Plumbing Fixtures", "quantity": 1.0, "unit": "set", "unit_cost": 1250.00, "total": 1250, "csi_division": "22"},
                {"line_number": 7, "description": "Plumbing Rough-in", "quantity": 1.0, "unit": "ls", "unit_cost": 2800.00, "total": 2800, "csi_division": "22"},
                {"line_number": 8, "description": "Lighting Fixtures (LED)", "quantity": 12.0, "unit": "ea", "unit_cost": 175.00, "total": 2100, "csi_division": "26"},
                {"line_number": 9, "description": "Appliance Package", "quantity": 1.0, "unit": "set", "unit_cost": 3500.00, "total": 3500, "csi_division": "11"},
                {"line_number": 10, "description": "Backsplash Tile", "quantity": 30.0, "unit": "sf", "unit_cost": 8.50, "total": 255, "csi_division": "09"},
                {"line_number": 11, "description": "Sink and Faucet", "quantity": 1.0, "unit": "set", "unit_cost": 600.00, "total": 600, "csi_division": "22"},
                {"line_number": 12, "description": "Range Hood", "quantity": 1.0, "unit": "ea", "unit_cost": 500.00, "total": 500, "csi_division": "11"},
                {"line_number": 13, "description": "Garbage Disposal", "quantity": 1.0, "unit": "ea", "unit_cost": 250.00, "total": 250, "csi_division": "22"},
                {"line_number": 14, "description": "Drywall Repair", "quantity": 100.0, "unit": "sf", "unit_cost": 0.85, "total": 85, "csi_division": "09"},
                {"line_number": 15, "description": "Trim and Molding", "quantity": 60.0, "unit": "lf", "unit_cost": 3.50, "total": 210, "csi_division": "06"},
                {"line_number": 16, "description": "Permits and Fees", "quantity": 1.0, "unit": "ls", "unit_cost": 1200.00, "total": 1200, "csi_division": "01"},
                {"line_number": 17, "description": "Demolition", "quantity": 1.0, "unit": "ls", "unit_cost": 2000.00, "total": 2000, "csi_division": "02"},
                {"line_number": 18, "description": "Waste Removal", "quantity": 1.0, "unit": "ls", "unit_cost": 600.00, "total": 600, "csi_division": "02"},
                {"line_number": 19, "description": "Cabinet Hardware", "quantity": 30.0, "unit": "ea", "unit_cost": 12.00, "total": 360, "csi_division": "12"},
                {"line_number": 20, "description": "Contingency Allowance", "quantity": 1.0, "unit": "ls", "unit_cost": 1500.00, "total": 1500, "csi_division": "01"},
            ],
            "subtotal": mc_result.p50 * 0.90,
            "permits": mc_result.p50 * 0.03,
            "overhead": mc_result.p50 * 0.07,
            "markup_pct": 7,
        },

        # Assumptions and exclusions
        "assumptions": {
            "items": [
                "Site access is adequate for material delivery and crew parking",
                "Work performed during normal business hours (8am-5pm, Monday-Friday)",
                "No hidden damage, asbestos, lead paint, or mold present",
                "All required permits will be obtainable within 5 business days",
                "Existing electrical panel has adequate capacity for new loads",
                "Existing plumbing can support new fixture locations",
                "Material prices valid for 30 days from estimate date",
                "Client will make timely decisions on selections",
            ],
            "inclusions": [
                "All materials, labor, and equipment as specified",
                "Project management and site supervision",
                "Permit fees and inspection costs",
                "Standard 1-year workmanship warranty",
                "Daily cleanup and final construction cleaning",
                "Dumpster rental and debris disposal",
                "Protection of adjacent surfaces during construction",
            ],
            "exclusions": [
                {"category": "Structural Work", "items": ["Load-bearing wall modifications", "Foundation repairs", "Structural engineering"]},
                {"category": "Hazardous Materials", "items": ["Asbestos abatement", "Lead paint remediation", "Mold remediation"]},
                {"category": "HVAC", "items": ["HVAC system replacement", "Ductwork modifications"]},
                {"category": "Appliances", "items": ["Appliance delivery beyond curb", "Installation of owner-supplied appliances"]},
            ],
        },

        # CAD data (optional - set to None for this demo)
        "cad_data": None,
    }


def open_pdf(filepath: str) -> bool:
    """
    Attempt to open PDF in default viewer.

    Returns True if successful, False otherwise.
    """
    try:
        system = platform.system()
        if system == "Darwin":  # macOS
            subprocess.run(["open", filepath], check=True)
        elif system == "Windows":
            os.startfile(filepath)
        else:  # Linux
            subprocess.run(["xdg-open", filepath], check=True)
        return True
    except Exception:
        return False


def main():
    """Run the PDF generator demo."""
    parser = argparse.ArgumentParser(
        description="Generate sample PDF estimate report",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 demo_pdf_generator.py                    # Generate full report
  python3 demo_pdf_generator.py --client-ready     # Generate client version
  python3 demo_pdf_generator.py --sections executive_summary,cost_breakdown
  python3 demo_pdf_generator.py --open             # Open PDF after generation
        """,
    )
    parser.add_argument(
        "--client-ready",
        action="store_true",
        help="Generate client-ready version (hides internal notes)",
    )
    parser.add_argument(
        "--sections",
        type=str,
        help="Comma-separated list of sections to include",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open PDF in default viewer after generation",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Custom output filename (default: sample_estimate.pdf)",
    )

    args = parser.parse_args()

    # Parse sections
    sections: Optional[List[str]] = None
    if args.sections:
        sections = validate_sections(args.sections.split(","))
        if not sections:
            print(f"Error: No valid sections provided. Available sections:")
            for s in get_available_sections():
                print(f"  - {s}")
            sys.exit(1)

    # Determine output filename
    if args.output:
        output_filename = args.output
    elif args.client_ready:
        output_filename = "sample_estimate_client.pdf"
    else:
        output_filename = "sample_estimate.pdf"

    output_path = Path(__file__).parent / output_filename

    print()
    print("=" * 60)
    print("  PDF Report Generator - Sample Estimate")
    print("=" * 60)
    print()

    # Create sample estimate
    estimate_data = create_kitchen_remodel_estimate()

    print(f"  Generating PDF for: {estimate_data['projectName']}")
    print(f"  Total Estimate: {format_currency(estimate_data['p50'])} (P50) / {format_currency(estimate_data['p80'])} (P80)")
    print()

    # Show sections being rendered
    sections_to_render = sections if sections else get_available_sections()
    print("  Rendering sections:")
    all_sections = get_available_sections()
    for section in all_sections:
        if section in sections_to_render:
            print(f"    [x] {section.replace('_', ' ').title()}")
        else:
            print(f"    [ ] {section.replace('_', ' ').title()} (excluded)")
    print()

    print("  Converting HTML to PDF...")

    # Generate PDF
    start_time = time.perf_counter()
    try:
        result = generate_pdf_local(
            estimate_data=estimate_data,
            output_path=str(output_path),
            sections=sections,
            client_ready=args.client_ready,
        )
        duration = time.perf_counter() - start_time

        print("  Uploading to storage... (skipped in demo mode)")
        print()
        print("  PDF Generated Successfully!")
        print("  " + "-" * 27)
        print(f"  File: {output_filename}")
        print(f"  Pages: {result.page_count}")
        print(f"  Size: {format_size(result.file_size_bytes)}")
        print(f"  Time: {duration:.1f} seconds")
        print()

        if args.client_ready:
            print("  Mode: Client-Ready")
            print()
            print("  Client-Ready Mode Differences:")
            print("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("  ✓ Cover page: Single 'Total Estimate' (no P50/P80/P90)")
            print("  ✓ Executive Summary: No Monte Carlo methodology")
            print("  ✓ Cost Breakdown: O&P hidden (baked into line items)")
            print("  ✓ Risk Analysis: Simplified contingency section")
            print("  ✓ Footer: Professional disclaimers added")
            print()
            print("  Compare with: python3 demo_pdf_generator.py (contractor version)")
        else:
            print("  Mode: Full Contractor Report")
            print()
            print("  Contractor Report Includes:")
            print("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("  • P50/P80/P90 confidence ranges")
            print("  • Monte Carlo simulation methodology")
            print("  • Overhead & Profit as separate line")
            print("  • Full risk analysis with histogram")
            print("  • Internal notes (if present)")
            print()
            print("  For client version: python3 demo_pdf_generator.py --client-ready")
        print()
        print("  Open the PDF to verify all sections are present.")
        print("=" * 60)
        print()

        # Open PDF if requested
        if args.open:
            print(f"  Opening {output_filename}...")
            if open_pdf(str(output_path)):
                print("  PDF opened in default viewer.")
            else:
                print("  Could not open PDF automatically.")
                print(f"  Please open manually: {output_path}")
            print()

    except Exception as e:
        print(f"\n  ERROR: PDF generation failed!")
        print(f"  {type(e).__name__}: {e}")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
