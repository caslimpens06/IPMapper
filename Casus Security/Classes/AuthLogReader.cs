using System.Text.Json;
using System.Text.RegularExpressions;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	public class AuthLogReader
	{
		public static List<LoginAttempt> loginAttempts = new();
		public static List<LoginAttempt> populatedAttempts = new();

		public static void ReadAuthLog()
		{
			string filePath = "/var/log/auth.log";

			if (File.Exists(filePath))
			{
				Console.WriteLine("Reading data... \n");
				var lines = File.ReadAllText(filePath);

				ParseLoginAttempts(lines);

				foreach (LoginAttempt loginattempt in loginAttempts)
				{
					LoginAttempt login = GeoAPI.FetchLocationForLoginAttempt(loginattempt);
					populatedAttempts.Add(login);
					Console.WriteLine($"Added {login.ToString()}");
					
				}

				SaveLoginAttemptsToJSON();
			}
			else
			{
				Console.WriteLine("SSH log file does not exist. Check if SSH is enabled on your Linux machine.");
			}
		}

		public static void ParseLoginAttempts(string fileContent)
		{
			// Regex to capture relevant data - written by CHATGPT
			var regex = new Regex(
				@"(?<Timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2})\s+[a-zA-Z0-9\-]+\s+sshd\[\d+\]:\s+(?<Status>Failed\s+password|Accepted\s+password)\s+for\s+(invalid\s+user\s+)?(?<Username>\S+)\s+from\s+(?<IpAddress>\d+\.\d+\.\d+\.\d+)\s+port\s+\d+\s+ssh2");

			var matches = regex.Matches(fileContent);

			foreach (Match match in matches)
			{
				string timestamp = match.Groups["Timestamp"].Value;
				DateTime parsedTimestamp = DateTime.ParseExact(timestamp, "yyyy-MM-ddTHH:mm:ss.ffffff+00:00", null);
				string formattedTimestamp = parsedTimestamp.ToString("dd-MM-yyyy HH:mm:ss");

				string username = match.Groups["Username"].Value;
				string status = match.Groups["Status"].Value;
				string ipAddress = match.Groups["IpAddress"].Value;

				LoginAttempt loginAttempt = new LoginAttempt(formattedTimestamp, username, new IP(ipAddress), status);

				if (loginAttempt.Ip != null)
				{
					loginAttempts.Add(loginAttempt);
				}
			}
		}

		private static void SaveLoginAttemptsToJSON()
		{
			string jsonPathLinuxAuth = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web", "iplistlinuxauth.json");
			
			if (File.Exists(jsonPathLinuxAuth))
			{
				string jsonContent = JsonSerializer.Serialize(populatedAttempts, new JsonSerializerOptions { WriteIndented = true });

				File.WriteAllText(jsonPathLinuxAuth, jsonContent);
			}
			else
			{
				Console.WriteLine($"No file found at: {jsonPathLinuxAuth}");
			}
		}
	}
}
