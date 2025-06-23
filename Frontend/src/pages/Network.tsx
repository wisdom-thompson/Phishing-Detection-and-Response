import { useState, useCallback } from "react";
import Sidebar from "../components/Layout/Sidebar";
import { Navbar } from "../components/Layout/Navbar";
import { Footer } from "../components/Layout/Footer";
import { scanNetwork } from "../services/api";
import TrafficMonitor from "../components/Network/TrafficMonitor";
import "./Network.scss";

interface NetworkDevice {
  ip: string;
  mac: string;
  vendor: string;
}

export default function NetworkPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScanNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const discoveredDevices = await scanNetwork();
      if (discoveredDevices) {
        setDevices(discoveredDevices);
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred during the network scan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Navbar />
        <div className="network-page">
          <div className="network-page__header">
            <h1>Network Discovery</h1>
            <button className="btn btn--primary" onClick={handleScanNetwork} disabled={isLoading}>
              {isLoading ? "Scanning..." : "Scan Network"}
            </button>
          </div>
          <p className="network-page__description">
            Discover all devices currently connected to your local network.
          </p>
          
          <div className="network-devices-container">
            <table className="network-devices-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Device Vendor</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && !error && (
                  <tr><td colSpan={3} className="centered-message">Scanning your network...</td></tr>
                )}
                {error && (
                   <tr><td colSpan={3} className="centered-message error-message">{error}</td></tr>
                )}
                {!isLoading && !error && devices.length === 0 && (
                  <tr><td colSpan={3} className="centered-message">No devices found. Click "Scan Network" to begin.</td></tr>
                )}
                {devices.map((device) => (
                  <tr key={device.mac}>
                    <td>{device.ip}</td>
                    <td>{device.mac}</td>
                    <td>{device.vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TrafficMonitor />

        </div>
        <Footer />
      </main>
    </div>
  );
} 