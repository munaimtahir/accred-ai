import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertCircle } from 'lucide-react';

interface AuditLogEntry {
    id: number;
    actor: string;
    action: string;
    entity: string;
    timestamp: string;
    metadata?: any;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAuditLogs();
            setLogs(data);
        } catch (err: any) {
            if (err.message && (err.message.includes('403') || err.message.includes('authorized'))) {
                setError('Not authorized to view audit logs.');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to load audit logs');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied / Error</h3>
                <p className="text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500 mt-1">System activity and security events</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-900">Timestamp</th>
                                <th className="px-6 py-4 font-medium text-slate-900">Actor</th>
                                <th className="px-6 py-4 font-medium text-slate-900">Action</th>
                                <th className="px-6 py-4 font-medium text-slate-900">Entity</th>
                                <th className="px-6 py-4 font-medium text-slate-900">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {log.actor}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {log.entity}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                            {JSON.stringify(log.metadata || {})}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
