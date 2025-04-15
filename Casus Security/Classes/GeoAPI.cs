using System.Text.Json;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
    class GeoAPI
    {
        private static readonly HttpClient _HttpClient = new HttpClient();
        private const string BaseUrl = "https://ipinfo.io/";

        public static IP FetchLocationForIP(IP ip)
        {
            try
            {
                string url = $"{BaseUrl}{ip.ForeignAddress}/json";
                Console.WriteLine($"Fetching location for IP: {ip.ForeignAddress}");

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

                        return ip;
                    }
                    else
                    {
                        Console.WriteLine($"Invalid location data for {ip.ForeignAddress}");
                    }
                }
                else
                {
                    Console.WriteLine($"No location data available for {ip.ForeignAddress}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while fetching data for {ip.ForeignAddress}: {ex.Message}");
            }

            return null;
        }
    }
}
