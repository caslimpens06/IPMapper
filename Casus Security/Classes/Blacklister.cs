using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	public class Blacklister
	{
		private static List<IP> blacklistedIPs = new List<IP>();
		private static List<IP> geolocatedIPs = new List<IP>();

		public Blacklister() { }

		public static void BlacklistPrompt()
		{
			bool blacklisting = true;

			while (blacklisting)
			{
				Console.WriteLine("Wilt u custom IP-adressen toevoegen aan de blacklist? Deze worden gemarkeerd als IoC threat op de kaart. (ja/nee)");
				string? start = Console.ReadLine()?.ToLower();

				if (start == "nee")
				{
					Console.Clear();
					return;
				}
				else if (start == "ja")
				{
					while (true)
					{
						Console.Clear();
						Console.WriteLine("Voer een IP-adres in:");
						string? inputIP = Console.ReadLine();

						if (IsValidIPAddress(inputIP))
						{
							blacklistedIPs.Add(new IP(inputIP, true));
							Console.WriteLine($"IP {inputIP} is toegevoegd aan de blacklist.");
						}
						else
						{
							Console.WriteLine("Ongeldig IP-adres. Probeer het opnieuw.");
							Thread.Sleep(2000);
							continue;
						}

						// Vraag of er nog een IP toegevoegd moet worden
						while (true)
						{
							Console.WriteLine("\nWilt u nog een IP-adres toevoegen? (ja/nee)");
							string? response = Console.ReadLine()?.ToLower();

							if (response == "nee")
							{
								blacklisting = false;
								Console.Clear();
								break;
							}
							else if (response == "ja")
							{
								break; // breekt uit inner loop, en gaat verder met IP invoer
							}
							else
							{
								Console.WriteLine("Onjuiste invoer. Probeer het opnieuw...");
								Thread.Sleep(2000);
								Console.Clear();
							}
						}

						if (!blacklisting)
							break; // buitenste invoerloop breken
					}
				}
				else
				{
					Console.WriteLine("Onjuiste invoer. Probeer het opnieuw...");
					Thread.Sleep(2000);
					Console.Clear();
				}
			}

			// Opslaan van de geolocaties
			foreach (IP ip in blacklistedIPs)
			{
				IP? populatedIP = GeoAPI.FetchLocationForIP(ip);
				if (populatedIP != null)
				{
					populatedIP.IsMalicious = true;
					populatedIP.ApplicationName = "Jij hebt dit IP-address als blacklisted gemarkeerd";
					populatedIP.Protocol = "Unknown";
					geolocatedIPs.Add(populatedIP);
				}
			}

			string jsonPathBlacklist = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web/ioc_blacklist", "iocblacklist.json");
			string jsonContent = JsonSerializer.Serialize(geolocatedIPs, new JsonSerializerOptions { WriteIndented = true });
			File.WriteAllText(jsonPathBlacklist, jsonContent);

			Console.WriteLine("\n- Blacklist is opgeslagen -");
		}



		private static bool IsValidIPAddress(string ip)
		{
			return IPAddress.TryParse(ip, out _);
		}
	}
}
