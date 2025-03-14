using System.Diagnostics;
using System.Text.RegularExpressions;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	internal class IPScanner
	{
		private static List<IP> ipList = new();
		private static List<IP> displayedIPS = new();
		private static List<IP> oldIPS = new();
		private static HashSet<string> geolocatedIPs = new(); // Cache for IPs with known locations

		public IPScanner() { }

		public void ImportIpsFromNetstat()
		{
			ProcessStartInfo processStartInfo = new ProcessStartInfo
			{
				FileName = "netstat",
				Arguments = "-n",
				RedirectStandardOutput = true,
				UseShellExecute = false,
				CreateNoWindow = true
			};

			using (Process process = Process.Start(processStartInfo))
			{
				if (process == null)
				{
					Console.WriteLine("Failed to start netstat process.");
					return;
				}

				string output = process.StandardOutput.ReadToEnd();
				ParseOutgoingIpsFromNetstatOutput(output);
			}
		}

		private void ParseOutgoingIpsFromNetstatOutput(string netstatOutput)
		{
			// Regex to capture the IP addresses and state. It does not require the port.
			Regex regex = new Regex(@"(?<protocol>\S+)\s+(?<localAddress>\S+)\s+(?<foreignAddress>\S+)\s+(?<state>\S+)");

			string[] lines = netstatOutput.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);

			foreach (string line in lines)
			{
				if (line.Contains("Proto") || !line.Contains("ESTABLISHED"))
				{
					continue;
				}

				Match match = regex.Match(line);
				if (match.Success)
				{
					string protocol = match.Groups["protocol"].Value;
					string localAddress = match.Groups["localAddress"].Value;
					string foreignAddressWithPort = match.Groups["foreignAddress"].Value;
					string state = match.Groups["state"].Value;

					if (state.Equals("ESTABLISHED", StringComparison.OrdinalIgnoreCase))
					{
						string ip = ExtractIpFromForeignAddress(foreignAddressWithPort);

						// Skip invalid IPs like "127.0.0.1" or empty ones
						if (ip == "127.0.0.1" || string.IsNullOrEmpty(ip))
						{
							continue;
						}

						// Only add if it doesn't already exist in ipList
						if (!ipList.Any(existingIp => existingIp.ForeignAddress == ip))
						{
							ipList.Add(new IP(protocol, localAddress, ip, state));
						}
					}
				}
			}
		}

		private string ExtractIpFromForeignAddress(string foreignAddress)
		{
			Regex ipPattern = new Regex(@"^(?<ip>\d{1,3}(\.\d{1,3}){3})");
			Match match = ipPattern.Match(foreignAddress);

			if (match.Success)
			{
				return match.Groups["ip"].Value;
			}

			return string.Empty;
		}

		public static void PopulateIPS()
		{
			IPScanner scanner = new();
			scanner.ImportIpsFromNetstat();

			foreach (IP ip in ipList)
			{
				displayedIPS.Add(ip);
				oldIPS.Add(ip);
			}

			foreach (IP ip in displayedIPS)
			{
				if (!geolocatedIPs.Contains(ip.ForeignAddress) && (ip.Latitude == 0 || ip.Longitude == 0))
				{
					IP populatedIP = GeoAPI.FetchLocationForIP(ip);
					if (populatedIP != null)
					{
						geolocatedIPs.Add(populatedIP.ForeignAddress);
					}
				}
			}

			SaveIpsToJson(ipList);
		}

		private static void SaveIpsToJson(List<IP> ipList)
		{
			string jsonPath = @"C:\Users\casli\source\Security\Casus Security\Casus Security\web";

			string[] jsonFiles = Directory.GetFiles(jsonPath, "iplist.json");

			if (jsonFiles.Length > 0)
			{
				string firstJsonFile = jsonFiles[0];
				IPFileGenerator ipFile = new IPFileGenerator(firstJsonFile);
				ipFile.GenerateIPFile(ipList);
			}
			else
			{
				Console.WriteLine("No .json files found in the 'web' folder.");
			}
		}
	}
}
