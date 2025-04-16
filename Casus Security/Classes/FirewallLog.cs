using System.Net;
using System.Text.Json;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	public class FirewallLog
	{
		private const string LogFilePath = @"{0}\System32\LogFiles\Firewall\pfirewall.log";

		private static Dictionary<string, IP> ipDictionary = new Dictionary<string, IP>();
		private static List<IP> displayedIPList = new List<IP>();

		public static void ReadLog()
		{
			try
			{
				string systemRoot = Environment.GetEnvironmentVariable("SystemRoot");
				string logFilePath = string.Format(LogFilePath, systemRoot);
				if (!File.Exists(logFilePath) || systemRoot == null)
				{
					Console.WriteLine("Firewall-log not found. Is logging enabled on this computer?");
					return;
				}

				using (FileStream fs = new FileStream(logFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
				using (StreamReader sr = new StreamReader(fs))
				{
					string logContent = sr.ReadToEnd();
					string[] logLines = logContent.Split(new[] { Environment.NewLine }, StringSplitOptions.RemoveEmptyEntries);
					Console.WriteLine("\n-- Reading Firewall log... -- \n");
					ParseLogToJson(logLines);
				}
			}

			catch (UnauthorizedAccessException)
			{
				Console.WriteLine("Access denied - try running as administrator.");
			}
			catch (Exception ex)
			{
				Console.WriteLine("ERROR: " + ex.Message);
			}
		}


		public static void ParseLogToJson(string[] logLines)
		{
			foreach (var line in logLines)
			{
				string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

				if (parts.Length >= 10)
				{
					try
					{
						string protocol = parts[3];
						string localAddress = parts[4];
						string foreignAddress = parts[5];
						string state = parts[2];

						if (IsValidIp(foreignAddress))
						{
							if (ipDictionary.ContainsKey(foreignAddress))
							{
								ipDictionary[foreignAddress].HitCount++;
							}
							else
							{
								IP ip = new IP(protocol, localAddress, foreignAddress, state);
								ip.HitCount = 1;
								ipDictionary.Add(foreignAddress, ip);
							}
						}

					}
					catch (Exception ex)
					{
						Console.WriteLine($"Could not parse Firewall log: {ex}");
					}
				}
			}

			// Convert to list - get the top 50 highest hit count IP's
			var nonGeolocated = ipDictionary.Values
											 .OrderByDescending(ip => ip.HitCount)
											 .Take(50)
											 .ToList();

			foreach (IP noLocIP in nonGeolocated)
			{
				IP populatedIP = GeoAPI.FetchLocationForIP(noLocIP);
				if (populatedIP != null)
				{
					displayedIPList.Add(populatedIP);
					Console.WriteLine(populatedIP.ForeignAddress + " Hitcount: " + populatedIP.HitCount);
				}
			}

			SaveIpsToJson();
		}


		private static bool IsValidIp(string address)
		{
			if (string.IsNullOrEmpty(address))
			{
				return false;
			}

			if (IPAddress.TryParse(address, out IPAddress ip))
			{
				if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
				{
					byte[] ipBytes = ip.GetAddressBytes();

					// Exclude invalid IPv4 addresses like 0.0.0.0 and 255.255.255.255
					if (ipBytes[0] == 0 || ipBytes[0] == 255)
					{
						return false;
					}

					// Exclude multicast addresses (224.0.0.0 to 233.255.255.255)
					if (ipBytes[0] >= 224 && ipBytes[0] <= 233)
					{
						return false;
					}
				}

				if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
				{
					if (ip.ToString() == "::1")
					{
						return false;
					}

					if (ip.ToString().StartsWith("ff"))
					{
						return false;
					}
				}

				// If it's not in any of the excluded ranges, it's valid
				return true;
			}

			return false; // Not a valid IP
		}



		private static void SaveIpsToJson()
		{
			string jsonPathFirewall = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web", "iplistfirewall.json");

			if (File.Exists(jsonPathFirewall))
			{
				string jsonContent = JsonSerializer.Serialize(displayedIPList, new JsonSerializerOptions { WriteIndented = true });
				File.WriteAllText(jsonPathFirewall, jsonContent);
			}
			else
			{
				Console.WriteLine($"No file found at: {jsonPathFirewall}");
			}
		}
	}
}
