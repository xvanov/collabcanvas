#!/usr/bin/env python3
"""
Demo script for Monte Carlo Simulation Service.

Demonstrates the Monte Carlo simulation with a sample 20-item kitchen remodel
estimate, showing P50/P80/P90 percentiles, top risk factors, and generating
an HTML histogram visualization.

Usage:
    cd functions && python3 demo_monte_carlo.py

Output:
    - Console output with simulation results
    - monte_carlo_results.html file with interactive histogram chart
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from services.monte_carlo import (
    LineItemInput,
    run_simulation,
)


def format_currency(value: float) -> str:
    """Format a number as currency."""
    return f"${value:,.0f}"


def generate_html_histogram(result, filename: str = "monte_carlo_results.html"):
    """Generate an HTML file with a Chart.js histogram visualization."""
    # Extract histogram data
    labels = [f"${int(bin.range_low/1000)}k-${int(bin.range_high/1000)}k"
              for bin in result.histogram]
    data = [bin.count for bin in result.histogram]
    percentages = [bin.percentage for bin in result.histogram]

    # Create shortened labels for better display
    short_labels = []
    for bin in result.histogram:
        mid = (bin.range_low + bin.range_high) / 2
        short_labels.append(f"${mid/1000:.0f}k")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monte Carlo Simulation Results - Kitchen Remodel</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        .header p {{
            color: #7f8c8d;
        }}
        .stats-container {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .stat-card h3 {{
            margin: 0 0 10px 0;
            color: #7f8c8d;
            font-size: 14px;
            text-transform: uppercase;
        }}
        .stat-card .value {{
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }}
        .stat-card .value.p50 {{ color: #3498db; }}
        .stat-card .value.p80 {{ color: #e67e22; }}
        .stat-card .value.p90 {{ color: #e74c3c; }}
        .stat-card .value.contingency {{ color: #27ae60; }}
        .chart-container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }}
        .risks-container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .risks-container h2 {{
            margin-top: 0;
            color: #2c3e50;
        }}
        .risk-item {{
            display: flex;
            justify-content: space-between;
            padding: 15px;
            border-bottom: 1px solid #ecf0f1;
        }}
        .risk-item:last-child {{
            border-bottom: none;
        }}
        .risk-item .name {{
            font-weight: 500;
        }}
        .risk-item .impact {{
            color: #e74c3c;
            font-weight: bold;
        }}
        .risk-item .sensitivity {{
            color: #7f8c8d;
            font-size: 12px;
        }}
        .footer {{
            text-align: center;
            color: #7f8c8d;
            margin-top: 30px;
            padding: 20px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Monte Carlo Simulation Results</h1>
        <p>Kitchen Remodel Estimate - {result.iterations:,} iterations</p>
    </div>

    <div class="stats-container">
        <div class="stat-card">
            <h3>P50 (Median)</h3>
            <div class="value p50">{format_currency(result.p50)}</div>
        </div>
        <div class="stat-card">
            <h3>P80 (Likely)</h3>
            <div class="value p80">{format_currency(result.p80)}</div>
        </div>
        <div class="stat-card">
            <h3>P90 (Conservative)</h3>
            <div class="value p90">{format_currency(result.p90)}</div>
        </div>
        <div class="stat-card">
            <h3>Recommended Contingency</h3>
            <div class="value contingency">{result.recommended_contingency:.1f}%</div>
        </div>
    </div>

    <div class="chart-container">
        <h2>Cost Distribution</h2>
        <canvas id="histogram"></canvas>
    </div>

    <div class="risks-container">
        <h2>Top 5 Risk Factors</h2>
        {"".join([f'''
        <div class="risk-item">
            <div>
                <div class="name">{i+1}. {risk.item}</div>
                <div class="sensitivity">Sensitivity: {risk.sensitivity:.2f}</div>
            </div>
            <div class="impact">+{format_currency(risk.impact)} impact</div>
        </div>
        ''' for i, risk in enumerate(result.top_risks)])}
    </div>

    <div class="footer">
        <p>Generated by TrueCost Monte Carlo Simulation Engine</p>
        <p>Statistics: Mean {format_currency(result.mean)} | Std Dev {format_currency(result.std_dev)} | Range {format_currency(result.min_value)} - {format_currency(result.max_value)}</p>
    </div>

    <script>
        const ctx = document.getElementById('histogram').getContext('2d');
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: {short_labels},
                datasets: [{{
                    label: 'Frequency',
                    data: {data},
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        display: false
                    }},
                    tooltip: {{
                        callbacks: {{
                            label: function(context) {{
                                const percentage = {percentages}[context.dataIndex];
                                return `${{context.raw}} iterations (${{percentage.toFixed(1)}}%)`;
                            }}
                        }}
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        title: {{
                            display: true,
                            text: 'Number of Iterations'
                        }}
                    }},
                    x: {{
                        title: {{
                            display: true,
                            text: 'Total Cost Range'
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

    with open(filename, 'w') as f:
        f.write(html_content)

    return filename


def create_kitchen_remodel_estimate():
    """Create a sample 20-item kitchen remodel estimate."""
    return [
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


def main():
    """Run the Monte Carlo demo."""
    print()
    print("=" * 60)
    print("  Monte Carlo Simulation Results - Kitchen Remodel Estimate")
    print("=" * 60)
    print()

    # Create sample estimate
    line_items = create_kitchen_remodel_estimate()

    # Run simulation
    result = run_simulation(line_items, iterations=1000)

    # Display results
    print(f"  Iterations: {result.iterations:,}")
    print(f"  Line Items: {len(line_items)}")
    print()

    print("  Cost Percentiles:")
    print(f"    P50 (Median):       {format_currency(result.p50)}")
    print(f"    P80 (Likely):       {format_currency(result.p80)}")
    print(f"    P90 (Conservative): {format_currency(result.p90)}")
    print()

    print(f"  Recommended Contingency: {result.recommended_contingency:.1f}%")
    print("  (Based on P80-P50 spread)")
    print()

    print("  Top 5 Risk Factors:")
    for i, risk in enumerate(result.top_risks, 1):
        # Determine reason based on item characteristics
        item = next((item for item in line_items if item.description == risk.item), None)
        if item:
            variance = (item.unit_cost_high - item.unit_cost_low) / item.unit_cost_likely
            if variance > 0.5:
                reason = "high price volatility"
            elif item.quantity > 50:
                reason = "high quantity"
            elif item.unit_cost_likely > 1000:
                reason = "high unit cost"
            else:
                reason = "cost uncertainty"
        else:
            reason = "variance contribution"

        print(f"    {i}. {risk.item:25} +{format_currency(risk.impact)} impact ({reason})")
    print()

    # Generate HTML histogram
    html_file = generate_html_histogram(result)
    print(f"  Histogram saved to: {html_file}")
    print()

    # Additional statistics
    print("  Additional Statistics:")
    print(f"    Mean:    {format_currency(result.mean)}")
    print(f"    Std Dev: {format_currency(result.std_dev)}")
    print(f"    Min:     {format_currency(result.min_value)}")
    print(f"    Max:     {format_currency(result.max_value)}")
    print()
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
