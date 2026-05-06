#!/usr/bin/env python3
"""
Compute peak hourly expedition counts per stop from GTFS data.

For each stop, finds the hour with the most departures across a typical weekday,
summing over all routes and directions.

Output: public/data/stop_expeditions.json
"""

import pandas as pd
import json
import argparse
from pathlib import Path
from collections import defaultdict


def parse_hour(time_str):
    """Parse hour from HH:MM:SS, handling overnight times (>24:00:00)."""
    h = int(str(time_str).split(':')[0])
    return h % 24


def main():
    parser = argparse.ArgumentParser(description='Compute stop expeditions from GTFS')
    parser.add_argument('--gtfs-dir', default='./data/raw/GTFS', help='GTFS directory')
    parser.add_argument('--output', default='./public/data/stop_expeditions.json', help='Output file')
    args = parser.parse_args()

    gtfs_dir = Path(args.gtfs_dir)

    # Verify input files exist
    required_files = ['stop_times.txt', 'trips.txt', 'calendar.txt']
    for fname in required_files:
        if not (gtfs_dir / fname).exists():
            raise FileNotFoundError(f"Missing {fname} in {gtfs_dir}")

    print(f"Reading GTFS from {gtfs_dir}...")

    # Step 1: Find weekday service_ids (monday=1)
    calendar = pd.read_csv(gtfs_dir / 'calendar.txt')
    weekday_services = set(calendar[calendar['monday'] == 1]['service_id'])
    print(f"Found {len(weekday_services)} weekday service IDs")

    # Step 2: Get weekday trip_ids
    trips = pd.read_csv(gtfs_dir / 'trips.txt', usecols=['trip_id', 'service_id'])
    weekday_trips = set(trips[trips['service_id'].isin(weekday_services)]['trip_id'])
    print(f"Found {len(weekday_trips)} weekday trips")

    # Step 3: Load stop_times, filter to weekday trips
    stop_times = pd.read_csv(
        gtfs_dir / 'stop_times.txt',
        usecols=['trip_id', 'stop_id', 'departure_time']
    )
    stop_times = stop_times[stop_times['trip_id'].isin(weekday_trips)].copy()
    print(f"Loaded {len(stop_times)} stop_time records from weekday trips")

    # Step 4: Parse hour from departure_time
    stop_times['hour'] = stop_times['departure_time'].apply(parse_hour)

    # Step 5: Count departures per stop per hour
    counts = stop_times.groupby(['stop_id', 'hour']).size().reset_index(name='count')

    # Step 6: Find peak hour per stop
    peak = counts.groupby('stop_id')['count'].max().reset_index(name='peak')
    print(f"Computed peak expeditions for {len(peak)} stops")

    # Step 7: Build output
    by_stop = {
        str(row['stop_id']): {'peak': int(row['peak'])}
        for _, row in peak.iterrows()
    }

    output = {'byStop': by_stop}

    # Step 8: Write
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    max_peak = max((s['peak'] for s in by_stop.values()), default=0)
    print(f"OK: Wrote {len(by_stop)} stops to {output_path}")
    print(f"  Max peak expeditions: {max_peak}")


if __name__ == '__main__':
    main()
