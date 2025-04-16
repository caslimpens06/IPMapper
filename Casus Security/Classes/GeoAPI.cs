using System.Text.Json;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	public class GeoAPI
	{
		private static readonly HttpClient _HttpClient = new HttpClient();
		private const string BaseUrl = "https://ipinfo.io/";

		public static IP FetchLocationForIP(IP ip)
		{
			try
			{
				string url = $"{BaseUrl}{ip.ForeignAddress}/json";

				// Send HTTP GET request to the IPInfo API
				HttpResponseMessage response = _HttpClient.GetAsync(url).GetAwaiter().GetResult();

				if (!response.IsSuccessStatusCode)
				{
					return null;
				}

				string jsonResponse = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

				// Parse the JSON response
				var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);

				if (data.TryGetProperty("loc", out JsonElement locElement))
				{
					string[] latLong = locElement.GetString().Split(',');

					if (latLong.Length == 2)
					{
						double latitude = double.Parse(latLong[0], System.Globalization.CultureInfo.InvariantCulture);
						double longitude = double.Parse(latLong[1], System.Globalization.CultureInfo.InvariantCulture);

						ip.Latitude = latitude;
						ip.Longitude = longitude;
						Console.WriteLine($"Fetched location for IP: {ip.ForeignAddress}");
						return ip;
					}

				}
			}
			catch (Exception) { }
			
			return null;
		}

		public static LoginAttempt FetchLocationForLoginAttempt(LoginAttempt loginattempt)
		{
			try
			{
				string url = $"{BaseUrl}{loginattempt.Ip.ForeignAddress}/json";
				Console.WriteLine($"Fetching location for IP: {loginattempt.Ip.ForeignAddress}");

				// Send HTTP GET request to the IPInfo API
				HttpResponseMessage response = _HttpClient.GetAsync(url).GetAwaiter().GetResult();

				if (!response.IsSuccessStatusCode)
				{
					return loginattempt;
				}

				string jsonResponse = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

				// Parse the JSON response
				var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);

				if (data.TryGetProperty("loc", out JsonElement locElement))
				{
					string[] latLong = locElement.GetString().Split(',');

					if (latLong.Length == 2)
					{
						double latitude = double.Parse(latLong[0], System.Globalization.CultureInfo.InvariantCulture);
						double longitude = double.Parse(latLong[1], System.Globalization.CultureInfo.InvariantCulture);

						loginattempt.Ip.Latitude = latitude;
						loginattempt.Ip.Longitude = longitude;

						return loginattempt;
					}

				}
				else
				{
					loginattempt.Ip.Longitude = 0;
					loginattempt.Ip.Latitude = 0;
					return loginattempt;
				}
			}
			catch (Exception) { }
			return loginattempt;
		}
	}
}
