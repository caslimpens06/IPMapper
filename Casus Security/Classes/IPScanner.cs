using System.Diagnostics;
using System.Text.Json;
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
				Arguments = "-n -b",
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

                // Reformat the output
                string reformattedOutput = ReformatNetstatOutput(output);

                ParseOutgoingIpsFromNetstatOutput(reformattedOutput);
            }
        }

        private void ParseOutgoingIpsFromNetstatOutput(string netstatOutput)
		{

			// Regex to capture the IP addresses and state. It does not require the port.
			Regex regex = new Regex(@"(?<protocol>\S+)\s+(?<localAddress>\S+)\s+(?<foreignAddress>\S+)\s+(?<state>\S+)\s+(?<applicationName>\S+)");

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
                    string applicationName = match.Groups["applicationName"].Value;

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
							ipList.Add(new IP(protocol, localAddress, ip, state, applicationName));
						}
					}
				}
			}
		}

        private string ReformatNetstatOutput(string output)
        {
            // Split the output into lines
            string[] lines = output.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            List<string> reformattedLines = new List<string>();

            // Find the header line and add 'Application' after 'State'
            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i].Trim();

                if (line.StartsWith("Proto") && line.Contains("State"))
                {
                    int stateIndex = line.IndexOf("State");
                    if (stateIndex != -1)
                    {
                        line = line.Insert(stateIndex + "State".Length, " Application");
                    }
                }

                // Check if the line contains the application name
                if (line.StartsWith("[") && line.EndsWith("]"))
                {
                    // Combine with the previous line
                    if (reformattedLines.Count > 0)
                    {
                        reformattedLines[reformattedLines.Count - 1] += " " + line;
                    }
                }
                else
                {
                    reformattedLines.Add(line);
                }
            }

            return string.Join("\n", reformattedLines);
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

			SaveIpsToJson();
		}

		private static void SaveIpsToJson()
		{
			string jsonPathFirewall = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web", "iplist.json");

			if (File.Exists(jsonPathFirewall))
			{
				string jsonContent = JsonSerializer.Serialize(ipList, new JsonSerializerOptions { WriteIndented = true });
				File.WriteAllText(jsonPathFirewall, jsonContent);
			}
			else
			{
				Console.WriteLine($"No file found at: {jsonPathFirewall}");
			}
		}
	}
}
