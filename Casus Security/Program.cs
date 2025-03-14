using Casus_Security.Classes;

class Program
{
	static void Main(string[] args)
	{
		Cleanup();

		FirewallLog.ReadLog();

		IPScanner.PopulateIPS();
		
		WebServer.OpenLauncher();

		IPUpdater();
	}

	static void Cleanup()
	{
		string webFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");

		string ipListPath = Path.Combine(webFolderPath, "iplist.json");
		string ipListFirewallPath = Path.Combine(webFolderPath, "iplistfirewall.json");

		try
		{
			// Clear out previous JSON data
			File.WriteAllText(ipListPath, "[]");
			File.WriteAllText(ipListFirewallPath, "[]");

			Console.WriteLine("Successfully cleared both JSON files.");
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Error clearing files: {ex.Message}");
		}
	}

	static void IPUpdater() 
	{
		while (true)
		{
			System.Threading.Thread.Sleep(8000);
			IPScanner.PopulateIPS(); // Keep updating the IP's from NetStat every 8 seconds
		}
	}
}
