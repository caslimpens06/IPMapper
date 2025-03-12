using System.Data;
using Casus_Security.Classes;

class Program
{
	static void Main(string[] args)
	{
		IPScanner.PopulateIPS();
		
		WebServer.OpenLauncher();

		IPUpdater();
	}

	static void IPUpdater() 
	{
		while (true)
		{
			System.Threading.Thread.Sleep(8000);
			IPScanner.PopulateIPS(); // Keep updating the IP's from netstat
		}
	}
}
