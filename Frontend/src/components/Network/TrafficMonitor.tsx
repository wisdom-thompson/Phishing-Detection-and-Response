import { useState, useCallback } from 'react';
import { monitorNetworkTraffic } from '../../services/api';
import './TrafficMonitor.scss';

// Define the type for the traffic stats
interface TrafficStats {
  total_packets: number;
  total_bytes: number;
  protocol_counts: Record<string, number>;
  top_talkers: Record<string, number>;
  duration: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function TrafficMonitor() {
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMonitorTraffic = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    try {
      const trafficStats = await monitorNetworkTraffic(15); // Monitor for 15 seconds
      setStats(trafficStats);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during traffic monitoring.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="traffic-monitor-container">
      <div className="traffic-monitor__header">
        <h2>Live Traffic Analysis</h2>
        <button className="btn btn--primary" onClick={handleMonitorTraffic} disabled={isLoading}>
          {isLoading ? 'Monitoring...' : 'Start 15s Scan'}
        </button>
      </div>
      <p className="traffic-monitor__description">
        Capture and analyze network traffic for 15 seconds to identify top protocols and data usage.
        <strong> Requires administrator privileges.</strong>
      </p>

      {isLoading && <div className="centered-message">Capturing network packets...</div>}
      {error && <div className="centered-message error-message">{error}</div>}
      
      {stats && !isLoading && (
        <div className="traffic-stats-grid">
          <div className="stat-card">
            <h3>Total Packets</h3>
            <p>{stats.total_packets.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Total Data</h3>
            <p>{formatBytes(stats.total_bytes)}</p>
          </div>
          <div className="stat-card">
            <h3>Top Protocols</h3>
            <ul>
              {Object.entries(stats.protocol_counts).map(([proto, count]) => (
                <li key={proto}><span>{proto}:</span> {count.toLocaleString()}</li>
              ))}
            </ul>
          </div>
          <div className="stat-card">
            <h3>Top Talkers</h3>
            <ul>
              {Object.entries(stats.top_talkers).map(([ip, bytes]) => (
                <li key={ip}><span>{ip}:</span> {formatBytes(bytes)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 