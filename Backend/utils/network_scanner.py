import logging
import socket
import subprocess
import platform
import requests
import re
from typing import List, Dict, Union
from collections import defaultdict
import time

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')


def get_mac_vendor(mac_address):
    """
    Looks up the vendor of a MAC address using the macvendors.com API.
    """
    # API endpoint for MAC address lookup
    url = f"https://api.macvendors.com/{mac_address}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.text
        else:
            return "Unknown Vendor"
    except requests.RequestException:
        return "Vendor Lookup Failed"


def get_local_ip():
    """Get the local IP address of the machine."""
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        logging.info(f"Detected local IP: {local_ip}")
        return local_ip
    except Exception as e:
        logging.warning(f"Could not detect local IP: {e}")
        return "192.168.1.1"  # Fallback


def test_network_connectivity():
    """Test basic network connectivity."""
    try:
        # Test internet connectivity
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        logging.info("Internet connectivity: OK")
        return True
    except Exception as e:
        logging.error(f"No internet connectivity: {e}")
        return False


def test_gateway_connectivity(network_base: str):
    """Test if we can reach the gateway/router."""
    try:
        gateway_ip = f"{network_base}.1"  # Most common gateway IP
        logging.info(f"Testing gateway connectivity to: {gateway_ip}")

        if platform.system().lower() == "windows":
            result = subprocess.run(
                ["ping", "-n", "1", "-w", "1000", gateway_ip],
                capture_output=True,
                text=True,
                timeout=2
            )
        else:
            result = subprocess.run(
                ["ping", "-c", "1", "-W", "1", gateway_ip],
                capture_output=True,
                text=True,
                timeout=2
            )

        if result.returncode == 0:
            logging.info(f"Gateway {gateway_ip} is reachable")
            return True
        else:
            logging.warning(f"Gateway {gateway_ip} is not reachable")
            return False

    except Exception as e:
        logging.error(f"Error testing gateway: {e}")
        return False


def test_ping_functionality():
    """Test if ping command works on this system."""
    try:
        if platform.system().lower() == "windows":
            result = subprocess.run(
                ["ping", "-n", "1", "127.0.0.1"],
                capture_output=True,
                text=True,
                timeout=2
            )
        else:
            result = subprocess.run(
                ["ping", "-c", "1", "127.0.0.1"],
                capture_output=True,
                text=True,
                timeout=2
            )

        if result.returncode == 0:
            logging.info("Ping functionality test: OK")
            return True
        else:
            logging.error("Ping functionality test: FAILED")
            return False

    except Exception as e:
        logging.error(f"Ping functionality test error: {e}")
        return False


def ping_scan_network(network_base: str) -> List[Dict[str, str]]:
    """
    Scan network using ping (doesn't require elevated privileges).
    """
    devices = []
    logging.info(f"Starting ping scan for network: {network_base}.0/24")

    # Test gateway first
    if test_gateway_connectivity(network_base):
        gateway_device = {
            "ip": f"{network_base}.1",
            "mac": "MAC address requires elevated privileges",
            "vendor": "Router/Gateway"
        }
        devices.append(gateway_device)
        logging.info(f"Added gateway device: {network_base}.1")

    try:
        # Scan a smaller range for faster results (common device ranges)
        # Most home networks have devices in these ranges
        scan_ranges = [
            (2, 20),    # Common device range
            (100, 120),  # DHCP range
            (200, 220)  # Additional range
        ]

        for start, end in scan_ranges:
            logging.info(f"Scanning range {network_base}.{start}-{end}")
            for i in range(start, end + 1):
                ip = f"{network_base}.{i}"
                try:
                    # Use ping with very short timeout for speed
                    if platform.system().lower() == "windows":
                        result = subprocess.run(
                            ["ping", "-n", "1", "-w", "200", ip],  # 200ms timeout
                            capture_output=True,
                            text=True,
                            timeout=0.5  # 500ms total timeout
                        )
                    else:
                        result = subprocess.run(
                            ["ping", "-c", "1", "-W", "1", ip],
                            capture_output=True,
                            text=True,
                            timeout=0.5
                        )

                    if result.returncode == 0:
                        logging.info(f"Found device at: {ip}")
                        device = {
                            "ip": ip,
                            "mac": "MAC address requires elevated privileges",
                            "vendor": "Vendor lookup requires MAC address"
                        }
                        devices.append(device)

                except subprocess.TimeoutExpired:
                    continue
                except Exception as e:
                    logging.debug(f"Error pinging {ip}: {e}")
                    continue

    except Exception as e:
        logging.error(f"Error in ping scan: {e}")

    logging.info(f"Ping scan completed. Found {len(devices)} devices.")
    return devices


def discover_devices(network_cidr: str = None) -> Union[List[Dict[str, str]], Dict[str, str]]:
    """
    Discovers devices on the local network using multiple methods.

    Args:
        network_cidr (str): The network range to scan in CIDR notation.

    Returns:
        list: A list of dictionaries, where each dictionary represents a device.
    """
    # Test network connectivity first (but don't fail if it doesn't work)
    try:
        internet_ok = test_network_connectivity()
        if not internet_ok:
            logging.warning(
                "No internet connectivity detected, but continuing with local network scan")
    except Exception as e:
        logging.warning(
            f"Internet connectivity test failed: {e}, continuing with local network scan")

    if not network_cidr:
        # Auto-detect network
        local_ip = get_local_ip()
        network_base = ".".join(local_ip.split(".")[:3])
        network_cidr = f"{network_base}.0/24"

    logging.info(f"Scanning network: {network_cidr}")

    # Try Scapy first (requires elevated privileges)
    try:
        from scapy.all import ARP, Ether, srp

        # Create an ARP request packet
        arp_request = ARP(pdst=network_cidr)
        # Create an Ethernet broadcast packet
        broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
        # Combine the packets
        arp_request_broadcast = broadcast / arp_request

        # Send the packet and receive responses
        answered_list = srp(arp_request_broadcast, timeout=2, verbose=False)[0]

        logging.info(f"Scapy scan found {len(answered_list)} devices.")

        devices = []
        for sent_packet, received_packet in answered_list:
            mac_address = received_packet.hwsrc
            vendor = get_mac_vendor(mac_address)
            device = {
                "ip": received_packet.psrc,
                "mac": mac_address,
                "vendor": vendor
            }
            devices.append(device)

        return devices

    except ImportError:
        logging.warning("Scapy not available, falling back to ping scan")
    except PermissionError:
        logging.warning(
            "Insufficient privileges for Scapy scan, falling back to ping scan")
    except Exception as e:
        logging.warning(f"Scapy scan failed: {e}, falling back to ping scan")

    # Fallback to ping scan (doesn't require elevated privileges)
    try:
        # Test ping functionality first
        if not test_ping_functionality():
            return {
                "error": "Ping not available",
                "message": "Ping command is not working on this system. Cannot perform network scan."
            }

        network_base = ".".join(network_cidr.split(".")[:3])
        devices = ping_scan_network(network_base)

        if devices:
            logging.info(f"Ping scan found {len(devices)} devices.")
            return devices
        else:
            logging.warning("No devices found in ping scan")
            return {"error": "No devices found", "message": "Network scan completed but no devices were discovered. This might be due to firewall settings or network configuration."}

    except Exception as e:
        logging.error(f"Ping scan also failed: {e}")
        return {
            "error": str(e),
            "message": "Both Scapy and ping scans failed. Try running with elevated privileges or check network connectivity."
        }


def get_network_info():
    """Get and display network information for debugging."""
    try:
        local_ip = get_local_ip()
        network_base = ".".join(local_ip.split(".")[:3])
        network_range = f"{network_base}.0/24"

        info = {
            "local_ip": local_ip,
            "network_base": network_base,
            "network_range": network_range,
            "gateway": f"{network_base}.1"
        }

        logging.info(f"Network Info: {info}")
        return info

    except Exception as e:
        logging.error(f"Error getting network info: {e}")
        return None


def monitor_traffic(duration=15):
    """
    Monitors network traffic for a given duration and returns statistics.
    This function requires scapy and elevated privileges.
    """
    try:
        from scapy.all import sniff, IP

        packets_data = {
            "total_packets": 0,
            "total_bytes": 0,
            "protocol_counts": defaultdict(int),
            "top_talkers": defaultdict(int),  # IP -> bytes
            "start_time": time.time(),
            "end_time": 0,
            "duration": duration,
        }

        def process_packet(packet):
            packets_data["total_packets"] += 1
            if packet.haslayer(IP):
                ip_layer = packet.getlayer(IP)
                packet_size = len(packet)
                packets_data["total_bytes"] += packet_size
                packets_data["top_talkers"][ip_layer.src] += packet_size

                proto_map = {1: "ICMP", 6: "TCP", 17: "UDP"}
                protocol = proto_map.get(ip_layer.proto, "Other")
                packets_data["protocol_counts"][protocol] += 1

        logging.info(
            f"Starting network traffic monitoring for {duration} seconds...")
        sniff(prn=process_packet, timeout=duration, store=False)
        logging.info("Network traffic monitoring finished.")

        packets_data["end_time"] = time.time()

        # Convert defaultdicts to regular dicts for JSON serialization
        packets_data["protocol_counts"] = dict(packets_data["protocol_counts"])

        # Sort top talkers and take top 5
        sorted_talkers = sorted(
            packets_data["top_talkers"].items(), key=lambda item: item[1], reverse=True)
        packets_data["top_talkers"] = dict(sorted_talkers[:5])

        return packets_data

    except (ImportError, PermissionError):
        logging.error(
            "Permission denied to sniff traffic. Please run as administrator and ensure Npcap is installed.")
        return {"error": "Permission Denied", "message": "Traffic monitoring requires elevated privileges and Npcap. Please run as an administrator."}
    except Exception as e:
        logging.error(f"An error occurred during traffic monitoring: {e}")
        return {"error": str(e), "message": "An unexpected error occurred while monitoring network traffic."}
