using System.Net;
using System.Text.Json;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	public class FirewallLog
	{
		private const string LogFilePath = @"{0}\System32\LogFiles\Firewall\pfirewall.log";
		
		private static List<IP> ipList = new List<IP>();
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

					// Take the first 100 lines if there are that many.
					var first100Lines = logLines.Take(100).ToArray();

					ParseLogToJson(first100Lines);
					SaveIpsToJson();
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

						if (IsValidIp(localAddress) && IsValidIp(foreignAddress))
						{
							IP ip = new IP(protocol, localAddress, foreignAddress, state);
							ipList.Add(ip);
						}
					}
					catch (Exception ex)
					{
					}
				}
			}

			// Remove duplicates based on ForeignAddress
			
			HashSet<string> seenForeignAddresses = new HashSet<string>();
			ipList.RemoveAll(ip => !seenForeignAddresses.Add(ip.ForeignAddress));
			

			foreach (IP noLocIP in ipList)
			{
				IP populatedIP = GeoAPI.FetchLocationForIP(noLocIP);
				if (populatedIP != null)
				{
					displayedIPList.Add(populatedIP);
				}
			}
		}

		private static bool IsValidIp(string address)
		{
			return IPAddress.TryParse(address, out _);
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
