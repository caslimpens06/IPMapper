using System.Diagnostics;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	internal class IPScanner
	{
		private static List<IP> GeolocatedIPs = new();  // List for geolocated IPs
		private static List<IP> FromNetstat = new();    // List for IPs fetched from netstat
		private static HashSet<string> geolocatedIPsSet = new(); // Set for faster lookups

		public IPScanner() { }

		public static void ImportIpsFromNetstat()
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

				string reformattedOutput = ReformatNetstatOutput(output);

				ParseOutgoingIpsFromNetstatOutput(reformattedOutput);
			}
		}

		private static void ParseOutgoingIpsFromNetstatOutput(string netstatOutput)
		{
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

						if (ip != "127.0.0.1" && !string.IsNullOrEmpty(ip))
						{
							if (!FromNetstat.Any(existingIp => existingIp.ForeignAddress == ip))
							{
								FromNetstat.Add(new IP(protocol, localAddress, ip, state, applicationName));
							}
						}
					}
				}
			}
		}

		private static string ReformatNetstatOutput(string output)
		{
			string[] lines = output.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
			List<string> reformattedLines = new List<string>();

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

				if (line.StartsWith("[") && line.EndsWith("]"))
				{
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

		private static string ExtractIpFromForeignAddress(string foreignAddress)
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
			Console.WriteLine("\n Getting Netstat data... \n");
			ImportIpsFromNetstat();

			foreach (IP ip in FromNetstat)
			{
				if (!geolocatedIPsSet.Contains(ip.ForeignAddress))
				{
					IP ?populatedIP = GeoAPI.FetchLocationForIP(ip);
					if (populatedIP != null)
					{
						geolocatedIPsSet.Add(populatedIP.ForeignAddress);
						GeolocatedIPs.Add(populatedIP);
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
				string jsonContent = JsonSerializer.Serialize(GeolocatedIPs, new JsonSerializerOptions { WriteIndented = true });
				File.WriteAllText(jsonPathFirewall, jsonContent);
			}
			else
			{
				Console.WriteLine($"No file found at: {jsonPathFirewall}");
			}
		}
	}
}
