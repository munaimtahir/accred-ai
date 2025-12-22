import { Indicator, ComplianceStatus } from '../types';

/**
 * Calculate compliance percentage for a set of indicators
 */
export function calculateCompliancePercentage(indicators: Indicator[]): number {
  if (indicators.length === 0) return 0;
  const compliant = indicators.filter(i => i.status === 'Compliant').length;
  return Math.round((compliant / indicators.length) * 100);
}

/**
 * Get status color classes for Tailwind
 */
export function getStatusColorClass(status: ComplianceStatus): string {
  switch (status) {
    case 'Compliant':
      return 'bg-green-100 text-green-700';
    case 'Non-Compliant':
      return 'bg-red-100 text-red-700';
    case 'In Progress':
      return 'bg-amber-100 text-amber-700';
    case 'Not Started':
      return 'bg-slate-100 text-slate-600';
    case 'Not Applicable':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/**
 * Check if an indicator is overdue based on frequency and last update
 */
export function isOverdue(indicator: Indicator): boolean {
  if (!indicator.lastUpdated || !indicator.frequency) return false;
  if (indicator.frequency === 'One-time') return false;

  const lastUpdate = new Date(indicator.lastUpdated);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  switch (indicator.frequency) {
    case 'Daily':
      return daysSince >= 1;
    case 'Weekly':
      return daysSince >= 7;
    case 'Monthly':
      return daysSince >= 30;
    case 'Quarterly':
      return daysSince >= 90;
    case 'Annually':
      return daysSince >= 365;
    default:
      return false;
  }
}

/**
 * Get days until next due date
 */
export function getDaysUntilDue(indicator: Indicator): number | null {
  if (!indicator.lastUpdated || !indicator.frequency) return null;
  if (indicator.frequency === 'One-time') return null;

  const lastUpdate = new Date(indicator.lastUpdated);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  let intervalDays: number;
  switch (indicator.frequency) {
    case 'Daily':
      intervalDays = 1;
      break;
    case 'Weekly':
      intervalDays = 7;
      break;
    case 'Monthly':
      intervalDays = 30;
      break;
    case 'Quarterly':
      intervalDays = 90;
      break;
    case 'Annually':
      intervalDays = 365;
      break;
    default:
      return null;
  }

  return intervalDays - daysSince;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV values that might contain commas within quotes
    const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v =>
      v.replace(/^"|"$/g, '').trim()
    ) || [];

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

/**
 * Generate CSV from array of objects
 */
export function generateCSV(data: Record<string, unknown>[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      const stringValue = value === null || value === undefined ? '' : String(value);
      // Escape quotes and wrap in quotes if contains comma
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Group indicators by section
 */
export function groupBySection(indicators: Indicator[]): Map<string, Indicator[]> {
  const grouped = new Map<string, Indicator[]>();
  indicators.forEach(ind => {
    const section = ind.section || 'Uncategorized';
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(ind);
  });
  return grouped;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
