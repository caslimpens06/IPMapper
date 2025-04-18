﻿using Casus_Security.Classes;
using System.Runtime.InteropServices;
class Program
{
	static void Main(string[] args)
	{
		
		if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
		{
			Console.WriteLine("Running in Windows... \n");
			Console.WriteLine("Welkom bij IPMapper! \n");

			Console.WriteLine(" ***   ****   *     *   ***   ****   ****   *****   ****  ");
			Console.WriteLine("  *    *   *  **   **  *   *  *   *  *   *  *       *   * ");
			Console.WriteLine("  *    ****   * * * *  *****  ****   ****   ****    ****  ");
			Console.WriteLine("  *    *      *  *  *  *   *  *      *      *       *  *  ");
			Console.WriteLine(" ***   *      *     *  *   *  *      *      *****   *   * \n");

			Console.WriteLine("LET OP! Deze applicatie gebruikt een gratis geolocation API voor het opvragen van IP-locaties. " +
			"Wanneer er geen punten zichtbaar zijn op de kaart en/of in de lijst, probeer het opnieuw met een VPN verbinding." +
			" Deze API heeft een gratis limiet. \n");

			Blacklister.BlacklistPrompt();

			Cleanup();

			Console.WriteLine("\nData verzamelen...");

			FirewallLog.ReadLog();

			IPScanner.PopulateIPS();

			WebServer.OpenLauncher();

			IPUpdaterWindows();
		}
		

		if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux)) 
		{
			Console.WriteLine("Running in Linux... \n");
			
			Cleanup();

			AuthLogReader.ReadAuthLog();

			WebServer.OpenLauncher();

			IPUpdaterLinux();

		}
	}

	static void Cleanup()
	{
		string webFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");

		string ipListPath = Path.Combine(webFolderPath, "iplist.json");
		string ipListFirewallPath = Path.Combine(webFolderPath, "iplistfirewall.json");
		string ipListLinuxAuth = Path.Combine(webFolderPath, "iplistlinuxauth.json");

		try
		{
			// Clear out previous JSON data
			File.WriteAllText(ipListPath, "[]");
			File.WriteAllText(ipListFirewallPath, "[]");
			File.WriteAllText(ipListLinuxAuth, "[]");

			Console.WriteLine("Successfully cleared JSON files.");
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Error clearing files: {ex.Message}");
		}
	}

	static void IPUpdaterWindows() 
	{
		while (true)
		{
			System.Threading.Thread.Sleep(8000);
			IPScanner.PopulateIPS(); // Keep updating the IP's from NetStat every 8 seconds
			System.Threading.Thread.Sleep(8000);
			FirewallLog.ReadLog(); // // Keep updating the IP's from the Firewall log file every 8 seconds
		}
	}

	static void IPUpdaterLinux()
	{
		while (true)
		{
			System.Threading.Thread.Sleep(8000);
			AuthLogReader.ReadAuthLog(); // // Keep updating the IP's from the auth.log file every 8 seconds
		}
	}
}